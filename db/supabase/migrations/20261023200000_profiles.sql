-- One profile per user: how we greet them, the currency for their new accounts, and whether they
-- finished onboarding (null = show it on their next visit).

create table public.profiles (
    user_id uuid primary key default auth.uid() references auth.users on delete cascade,
    display_name text check (length(trim(display_name)) > 0),
    currency char(3) not null default 'MXN',
    onboarded_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.profiles from anon;
-- Created with the user and deleted with them, never by hand.
grant select, update on public.profiles to authenticated;

create function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (user_id, created_at) values (new.id, new.created_at);
    return new;
end
$$;

revoke execute on function public.create_profile() from public, anon, authenticated;

create trigger on_auth_user_created_profile after insert on auth.users
    for each row execute function public.create_profile();

-- Existing users already set things up their way: no onboarding for them.
insert into public.profiles (user_id, created_at, onboarded_at)
select id, created_at, now() from auth.users;

-- "Eliminar cuenta": the user and, by cascade, everything they own.
create function public.delete_current_user() returns void
language sql security definer set search_path = '' as $$
    delete from auth.users where id = auth.uid()
$$;

revoke execute on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
