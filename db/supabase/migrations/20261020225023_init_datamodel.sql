-- Dineros v1: accounts, categories and transactions, owned per user (auth.users).
--
-- Access model: core verifies the Supabase JWT and runs every request as `authenticated` with the
-- user's claims (see core/app/api/deps.py), so the RLS policies below are what enforce ownership.
-- Composite FKs (<fk>, user_id) make it impossible to point at another user's account/category.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users on delete cascade,
    name text not null check (length(trim(name)) > 0),
    type text not null check (type in ('debit', 'credit', 'cash', 'savings', 'investment')),
    institution text,
    currency char(3) not null default 'MXN',
    -- Balance before any transaction. Credit cards: debt is negative (owing 5,000 = -5000).
    opening_balance numeric(14, 2) not null default 0,
    -- Credit cards only: limit, "día de corte" and "día límite de pago" (day of month).
    credit_limit numeric(14, 2) check (credit_limit > 0),
    statement_day smallint check (statement_day between 1 and 31),
    payment_due_day smallint check (payment_due_day between 1 and 31),
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    unique (id, user_id),
    check ((type = 'credit') = (statement_day is not null and payment_due_day is not null)),
    check (type = 'credit' or credit_limit is null)
);

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users on delete cascade,
    name text not null check (length(trim(name)) > 0),
    icon text check (length(icon) <= 16), -- an emoji, shown next to its transactions
    kind text not null check (kind in ('expense', 'income')),
    parent_id uuid,
    created_at timestamptz not null default now(),
    unique (id, user_id, kind),
    unique nulls not distinct (user_id, parent_id, name),
    -- A subcategory belongs to the same user and has the same kind as its parent.
    foreign key (parent_id, user_id, kind) references public.categories (id, user_id, kind)
        on delete set null (parent_id)
);

create table public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users on delete cascade,
    -- expense: money out of account_id. income: money into account_id.
    -- transfer: from account_id to to_account_id (credit card payment, savings, investments).
    kind text not null check (kind in ('expense', 'income', 'transfer')),
    amount numeric(14, 2) not null check (amount > 0),
    occurred_on date not null,
    account_id uuid not null,
    to_account_id uuid,
    category_id uuid,
    description text,
    notes text,
    tags text[] not null default '{}',
    location_name text,
    latitude double precision check (latitude between -90 and 90),
    longitude double precision check (longitude between -180 and 180),
    created_at timestamptz not null default now(),
    check ((kind = 'transfer') = (to_account_id is not null)),
    check (to_account_id <> account_id),
    foreign key (account_id, user_id) references public.accounts (id, user_id),
    foreign key (to_account_id, user_id) references public.accounts (id, user_id),
    -- Category must be the user's and match the kind; transfers can't have one (no such kind).
    foreign key (category_id, user_id, kind) references public.categories (id, user_id, kind)
        on delete set null (category_id)
);

create index on public.accounts (user_id);
create index on public.categories (user_id);
create index on public.transactions (user_id, occurred_on desc);
create index on public.transactions (account_id, occurred_on);
create index on public.transactions (to_account_id, occurred_on) where to_account_id is not null;
create index on public.transactions (category_id);
create index on public.transactions using gin (tags);

-- ---------------------------------------------------------------------------------------------
-- RLS: a user only sees and changes their own rows. No anon access at all.
-- ---------------------------------------------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "own accounts" on public.accounts for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own categories" on public.categories for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own transactions" on public.transactions for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.accounts, public.categories, public.transactions from anon;
grant select, insert, update, delete on public.accounts, public.categories, public.transactions
    to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Derived data (views run with the caller's permissions, so RLS applies to them too)
-- ---------------------------------------------------------------------------------------------

-- One signed row per account touched: negative = money out, positive = money in.
create view public.account_movements with (security_invoker = true) as
select id as transaction_id, user_id, account_id, occurred_on,
       case kind when 'income' then amount else -amount end as amount
from public.transactions
union all
select id, user_id, to_account_id, occurred_on, amount
from public.transactions
where kind = 'transfer';

create view public.account_balances with (security_invoker = true) as
select a.id as account_id, a.user_id,
       a.opening_balance + coalesce(sum(m.amount), 0) as balance,
       a.credit_limit + a.opening_balance + coalesce(sum(m.amount), 0) as available_credit
from public.accounts a
left join public.account_movements m on m.account_id = a.id
group by a.id;

-- `day` of the month of `month`, clamped to the month's last day (corte 31 → 28/29/30).
create function public.day_in_month(month date, day int) returns date
language sql immutable set search_path = '' as $$
    select make_date(
        extract(year from month)::int,
        extract(month from month)::int,
        least(day, extract(day from date_trunc('month', month) + interval '1 month - 1 day')::int)
    )
$$;

-- Credit card statements ("cortes"), one row per period up to the one currently open.
--   charges            what was spent in the period
--   statement_balance  debt at the corte date: the "pago para no generar intereses"
--   payments           money into the card between the corte and the due date
--   pending            what is still left to pay before the due date
-- ponytail: no MSI yet, every purchase is due in full at its corte; add an installments table
-- when MSI lands. Recomputed on every read; materialize if it gets slow.
create view public.credit_card_statements with (security_invoker = true) as
with periods as (
    select a.id as account_id, a.user_id, a.opening_balance,
           public.day_in_month((m - interval '1 month')::date, a.statement_day) + 1 as period_start,
           public.day_in_month(m::date, a.statement_day) as statement_date,
           case when a.payment_due_day > a.statement_day
               then public.day_in_month(m::date, a.payment_due_day)
               else public.day_in_month((m + interval '1 month')::date, a.payment_due_day)
           end as due_date
    from public.accounts a
    cross join lateral generate_series(
        date_trunc('month', least(
            a.created_at::date,
            (select min(t.occurred_on) from public.transactions t
             where a.id in (t.account_id, t.to_account_id))
        )),
        date_trunc('month', current_date) + interval '1 month',
        interval '1 month'
    ) m
    where a.type = 'credit'
),
totals as (
    select p.account_id, p.user_id, p.period_start, p.statement_date, p.due_date,
           coalesce(sum(-m.amount) filter (
               where m.amount < 0 and m.occurred_on between p.period_start and p.statement_date
           ), 0) as charges,
           -(p.opening_balance + coalesce(sum(m.amount) filter (
               where m.occurred_on <= p.statement_date
           ), 0)) as statement_balance,
           coalesce(sum(m.amount) filter (
               where m.amount > 0 and m.occurred_on > p.statement_date and m.occurred_on <= p.due_date
           ), 0) as payments
    from periods p
    left join public.account_movements m on m.account_id = p.account_id
    where p.period_start <= current_date
    group by p.account_id, p.user_id, p.opening_balance, p.period_start, p.statement_date,
             p.due_date
)
select *,
       statement_date < current_date as is_closed,
       greatest(statement_balance - payments, 0) as pending
from totals;

revoke all on public.account_movements, public.account_balances, public.credit_card_statements
    from anon;
grant select on public.account_movements, public.account_balances, public.credit_card_statements
    to authenticated;

-- ---------------------------------------------------------------------------------------------
-- New users start with an editable set of categories.
-- ---------------------------------------------------------------------------------------------

create function public.seed_default_categories() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.categories (user_id, name, icon, kind)
    select new.id, c.name, c.icon, c.kind
    from (values
        ('Súper y despensa', '🛒', 'expense'), ('Restaurantes', '🍽️', 'expense'),
        ('Transporte', '🚌', 'expense'), ('Gasolina', '⛽', 'expense'),
        ('Vivienda', '🏠', 'expense'), ('Servicios', '💡', 'expense'),
        ('Salud', '🏥', 'expense'), ('Educación', '🎓', 'expense'),
        ('Entretenimiento', '🎬', 'expense'), ('Suscripciones', '🔁', 'expense'),
        ('Ropa', '👕', 'expense'), ('Viajes', '✈️', 'expense'),
        ('Regalos', '🎁', 'expense'), ('Mascotas', '🐶', 'expense'),
        ('Comisiones e intereses', '🧾', 'expense'), ('Otros gastos', '📦', 'expense'),
        ('Nómina', '💼', 'income'), ('Transferencia recibida', '📥', 'income'),
        ('Honorarios', '🧑‍💻', 'income'), ('Rendimientos', '📈', 'income'),
        ('Reembolsos', '↩️', 'income'), ('Otros ingresos', '💰', 'income')
    ) as c (name, icon, kind);
    return new;
end
$$;

revoke execute on function public.seed_default_categories() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.seed_default_categories();
