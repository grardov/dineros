-- Credit cards added mid-period: the opening debt is part last corte, part charges since. Without
-- telling them apart, the first closed statement asked to pay the whole debt to avoid interest.
-- Also dates statements in Mexico City time instead of the server's UTC.

-- What was still left to pay of the last corte when the card was added (the remaining "pago para
-- no generar intereses"). The rest of the opening debt counts as charges of the current period.
-- Null keeps the old behavior: the whole opening debt belongs to the first corte.
alter table public.accounts
    add column last_statement_pending numeric(14, 2)
        check (last_statement_pending >= 0),
    add check (type = 'credit' or last_statement_pending is null),
    add check (last_statement_pending <= greatest(-opening_balance, 0));

-- ponytail: one timezone for everyone; add a per-user timezone when users live elsewhere.
create function public.local_date(ts timestamptz) returns date
language sql stable set search_path = '' as $$
    select (ts at time zone 'America/Mexico_City')::date
$$;

create or replace view public.credit_card_statements with (security_invoker = true) as
with periods as (
    select a.id as account_id, a.user_id, a.opening_balance, a.last_statement_pending,
           public.local_date(a.created_at) as created_on,
           public.day_in_month((m - interval '1 month')::date, a.statement_day) + 1 as period_start,
           public.day_in_month(m::date, a.statement_day) as statement_date,
           public.day_in_month((m + interval '1 month')::date, a.statement_day) as next_statement_date,
           case when a.payment_due_day > a.statement_day
               then public.day_in_month(m::date, a.payment_due_day)
               else public.day_in_month((m + interval '1 month')::date, a.payment_due_day)
           end as due_date
    from public.accounts a
    cross join lateral generate_series(
        date_trunc('month', least(
            public.local_date(a.created_at),
            (select min(t.occurred_on) from public.transactions t
             where a.id in (t.account_id, t.to_account_id))
        ))
        -- One month back so the corte that last_statement_pending belongs to is always listed.
        - case when a.last_statement_pending is null then interval '0' else interval '1 month' end,
        date_trunc('month', public.local_date(now())) + interval '1 month',
        interval '1 month'
    ) m
    where a.type = 'credit'
),
totals as (
    select p.account_id, p.user_id, p.period_start, p.statement_date, p.due_date,
           coalesce(sum(-m.amount) filter (
               where m.amount < 0 and m.occurred_on between p.period_start and p.statement_date
           ), 0)
           -- The opening debt beyond last corte's pending was charged in the period it was added.
           + case when p.last_statement_pending is not null
                       and p.created_on between p.period_start and p.statement_date
                  then greatest(-p.opening_balance - p.last_statement_pending, 0)
                  else 0
             end as charges,
           case when p.last_statement_pending is not null and p.statement_date < p.created_on
               then p.last_statement_pending
               else -(p.opening_balance + coalesce(sum(m.amount) filter (
                   where m.occurred_on <= p.statement_date
               ), 0))
           end as statement_balance,
           coalesce(sum(m.amount) filter (
               where m.amount > 0 and m.occurred_on > p.statement_date and m.occurred_on <= p.due_date
           ), 0) as payments
    from periods p
    left join public.account_movements m on m.account_id = p.account_id
    where p.period_start <= public.local_date(now())
      -- With last_statement_pending, cortes older than the last one before the card was added
      -- would only show made-up debt.
      and (p.last_statement_pending is null or p.next_statement_date >= p.created_on)
    group by p.account_id, p.user_id, p.opening_balance, p.last_statement_pending, p.created_on,
             p.period_start, p.statement_date, p.due_date
)
select *,
       statement_date < public.local_date(now()) as is_closed,
       greatest(statement_balance - payments, 0) as pending
from totals;
