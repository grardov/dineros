-- "Fijos": recurring income, expenses and transfers (rent, utilities, payroll, savings, credit card
-- payments). Each one is a rule; recurring_occurrences turns it into what's due this month and
-- next, and a transaction linked to it (recurring_id + recurring_period) marks that month as paid.

create table public.recurring (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users on delete cascade,
    name text not null check (length(trim(name)) > 0),
    -- Same meaning as transactions.kind; a transfer into a credit card is its payment.
    kind text not null check (kind in ('expense', 'income', 'transfer')),
    -- The amount, or an estimate when is_variable. Null only for a credit card payment, whose
    -- amount is the statement due that month.
    amount numeric(14, 2) check (amount > 0),
    is_variable boolean not null default false,
    account_id uuid not null,
    to_account_id uuid,
    category_id uuid,
    -- Due on day_of_month (clamped to the month's last day) every `every_months` months, counting
    -- from the month of starts_on, until ends_on.
    day_of_month smallint not null check (day_of_month between 1 and 31),
    every_months smallint not null default 1 check (every_months in (1, 2, 3, 4, 6, 12)),
    starts_on date not null,
    ends_on date check (ends_on >= starts_on),
    paused_at timestamptz,
    created_at timestamptz not null default now(),
    unique (id, user_id),
    check ((kind = 'transfer') = (to_account_id is not null)),
    check (to_account_id <> account_id),
    check (amount is not null or kind = 'transfer'),
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
    foreign key (to_account_id, user_id) references public.accounts (id, user_id)
        on delete cascade,
    foreign key (category_id, user_id, kind) references public.categories (id, user_id, kind)
        on delete set null (category_id)
);

create index on public.recurring (user_id);

alter table public.recurring enable row level security;
create policy "own recurring" on public.recurring for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.recurring from anon;
grant select, insert, update, delete on public.recurring to authenticated;

-- A transaction registered from a fijo: which one and for which month (its first day). Deleting
-- the fijo unlinks it; the leftover period is harmless.
alter table public.transactions
    add column recurring_id uuid,
    add column recurring_period date check (recurring_period = date_trunc('month', recurring_period)),
    add check (recurring_id is null or recurring_period is not null),
    add foreign key (recurring_id, user_id) references public.recurring (id, user_id)
        on delete set null (recurring_id);

create index on public.transactions (recurring_id, recurring_period) where recurring_id is not null;

-- What each active fijo expects this month and next, in Mexico City time.
--   expected_amount  fixed: the amount. variable: average of its last 3 paid months (the
--                    estimate until there are any). card payment: the statement due that month.
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
    select r.id as recurring_id, r.user_id, r.amount, r.is_variable, r.to_account_id, m.month,
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
)
select d.recurring_id, d.user_id, d.month,
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
where not d.is_card_payment or s.account_id is not null;

revoke all on public.recurring_occurrences from anon;
grant select on public.recurring_occurrences to authenticated;
