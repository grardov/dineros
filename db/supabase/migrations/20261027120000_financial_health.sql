-- Salud financiera: how spending splits into needs and wants, measured against the user's own rule
-- (50/30/20 unless they change it).

-- An expense category is a need or a want; null on a subcategory means "same as its parent", and
-- on a top-level one, not classified yet.
alter table public.categories
    add column bucket text check (bucket in ('need', 'want')),
    add check (bucket is null or kind = 'expense');

-- The user's rule, as percentages of income, how many months of needs their emergency fund
-- should cover, and when they set it up (null: the page walks them through it first).
alter table public.profiles
    add column health_started_at timestamptz,
    add column needs_pct smallint not null default 50 check (needs_pct between 0 and 100),
    add column wants_pct smallint not null default 30 check (wants_pct between 0 and 100),
    add column savings_pct smallint not null default 20 check (savings_pct between 0 and 100),
    add column emergency_months smallint not null default 6 check (emergency_months between 1 and 24),
    add check (needs_pct + wants_pct + savings_pct = 100);

-- Classifies the default top-level categories the user still has under their original name.
create function public.set_default_buckets(uid uuid) returns void
language sql security definer set search_path = '' as $$
    update public.categories c
    set bucket = case
        when c.name in ('Súper y despensa', 'Transporte', 'Gasolina', 'Vivienda', 'Servicios',
                        'Salud', 'Educación', 'Mascotas', 'Comisiones e intereses') then 'need'
        when c.name in ('Restaurantes', 'Entretenimiento', 'Suscripciones', 'Ropa', 'Viajes',
                        'Regalos') then 'want'
    end
    where c.user_id = uid and c.parent_id is null and c.kind = 'expense' and c.bucket is null
$$;

revoke execute on function public.set_default_buckets(uuid) from public, anon, authenticated;

create or replace function public.seed_default_categories() returns trigger
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
    perform public.seed_default_subcategories(new.id);
    perform public.set_default_buckets(new.id);
    return new;
end
$$;

-- Existing users get them too; anything they already classified stays as it is.
select public.set_default_buckets(id) from auth.users;
