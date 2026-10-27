-- Only core reads and writes the data. Until now every table was granted to `authenticated`, which
-- is also the role Supabase's Data API (PostgREST/GraphQL) runs as, so anyone with a user JWT could
-- skip core and query it directly (RLS still applied). Now the grants and policies belong to `core`,
-- the role core runs each request as, and `authenticated` has nothing in public.
--
-- `core` can also log in: give it a password once and point core's DATABASE_URL at it (pooler
-- user `core.<project-ref>`) instead of `postgres`, which bypasses RLS:
--     alter role core with password '...';
-- Then a request that somehow skipped `set role` still runs under RLS, with no user: it sees nothing.
--
-- New tables: grant to core (not authenticated) and create their policies `to core`.

-- inherit: auth.uid() lives in the auth schema, which authenticated can use.
create role core login inherit;
grant authenticated to core;
-- So core (when connecting as postgres) can `set role core`.
grant core to postgres;

revoke all on public.accounts, public.categories, public.transactions, public.recurring,
    public.profiles from authenticated;
revoke all on public.account_movements, public.account_balances, public.credit_card_statements,
    public.recurring_occurrences from authenticated;

grant select, insert, update, delete on public.accounts, public.categories, public.transactions,
    public.recurring to core;
-- Created with the user and deleted with them, never by hand.
grant select, update on public.profiles to core;
grant select on public.account_movements, public.account_balances, public.credit_card_statements,
    public.recurring_occurrences to core;

alter policy "own accounts" on public.accounts to core;
alter policy "own categories" on public.categories to core;
alter policy "own transactions" on public.transactions to core;
alter policy "own recurring" on public.recurring to core;
alter policy "own profile" on public.profiles to core;

revoke execute on function public.delete_current_user() from authenticated;
grant execute on function public.delete_current_user() to core;

-- Supabase grants every new table in public to anon and authenticated by default; stop that.
alter default privileges for role postgres in schema public
    revoke all on tables from anon, authenticated;
