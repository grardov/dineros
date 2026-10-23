-- A card payment's estimate only counted the charges already registered, so fijos charged to the
-- card before its corte were missing until registered. It now adds them (fijo_charges). Those
-- fijos don't leave cash themselves; the card payment does, and the web counts only that.

drop view public.recurring_occurrences;

-- What each active fijo expects this month and next, in Mexico City time.
--   expected_amount  fixed: the amount. variable: average of its last 3 paid months (the
--                    estimate until there are any). card payment: the statement due that month
--                    plus, while its corte is open, fijo_charges.
--   fijo_charges     card payment: unpaid fijos charged to the card before its corte
--   is_estimate      variable, or a card statement whose corte hasn't closed yet
--   paid_amount      linked transactions that month (card payment: the statement's payments)
--   status           paid | overdue | pending
-- ponytail: two months only; widen `months` for a longer projection.
create view public.recurring_occurrences with (security_invoker = true) as
with months as (
    select (date_trunc('month', public.local_date(now())) + make_interval(months => n))::date
        as month
    from generate_series(0, 1) as n
),
due as (
    select r.id as recurring_id, r.user_id, r.kind, r.amount, r.is_variable, r.account_id,
           r.to_account_id, m.month,
           public.day_in_month(m.month, r.day_of_month) as due_on,
           r.amount is null and coalesce(card.type = 'credit', false) as is_card_payment
    from public.recurring r
    cross join months m
    left join public.accounts card on card.id = r.to_account_id
    where r.paused_at is null
      and m.month >= date_trunc('month', r.starts_on)
      and ((extract(year from m.month) - extract(year from r.starts_on)) * 12
           + extract(month from m.month) - extract(month from r.starts_on))::int
          % r.every_months = 0
      and (r.ends_on is null or public.day_in_month(m.month, r.day_of_month) <= r.ends_on)
),
occurrences as (
    select d.recurring_id, d.user_id, d.month, d.kind, d.account_id, d.to_account_id,
           d.is_card_payment, s.period_start, s.statement_date, s.is_closed,
           coalesce(s.due_date, d.due_on) as due_on,
           case when d.is_card_payment then greatest(s.statement_balance, 0)
                when d.is_variable then coalesce(round(recent.average, 2), d.amount)
                else d.amount
           end as expected_amount,
           d.is_variable or (d.is_card_payment and not s.is_closed) as is_estimate,
           case when d.is_card_payment then s.payments else coalesce(paid.total, 0) end
               as paid_amount,
           case when d.is_card_payment and s.is_closed and s.pending = 0 then 'paid'
                when not d.is_card_payment and paid.total is not null then 'paid'
                when coalesce(s.due_date, d.due_on) < public.local_date(now()) then 'overdue'
                else 'pending'
           end as status
    from due d
    left join lateral (
        select sum(t.amount) as total from public.transactions t
        where t.recurring_id = d.recurring_id and t.recurring_period = d.month
    ) paid on true
    left join lateral (
        select avg(month_total) as average from (
            select sum(t.amount) as month_total from public.transactions t
            where t.recurring_id = d.recurring_id
            group by t.recurring_period
            order by t.recurring_period desc
            limit 3
        ) last3
    ) recent on d.is_variable
    left join public.credit_card_statements s
        on d.is_card_payment and s.account_id = d.to_account_id
       and date_trunc('month', s.due_date) = d.month
    -- A card with no statement due that month has nothing to pay.
    where not d.is_card_payment or s.account_id is not null
)
select o.recurring_id, o.user_id, o.month, o.due_on,
       o.expected_amount + coalesce(c.total, 0) as expected_amount,
       o.is_estimate, o.paid_amount, o.status,
       coalesce(c.total, 0)::numeric(14, 2) as fijo_charges
from occurrences o
-- Registered (paid) ones are already in the statement balance.
left join lateral (
    select sum(f.expected_amount) as total from occurrences f
    where f.account_id = o.to_account_id and f.kind <> 'income' and f.status <> 'paid'
      and f.due_on between o.period_start and o.statement_date
) c on o.is_card_payment and not o.is_closed;

revoke all on public.recurring_occurrences from anon;
grant select on public.recurring_occurrences to authenticated;
