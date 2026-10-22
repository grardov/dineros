-- Default subcategories under the seeded top-level categories. Each user owns and can edit them,
-- like the rest of their categories.

create function public.seed_default_subcategories(uid uuid) returns void
language sql security definer set search_path = '' as $$
    insert into public.categories (user_id, name, icon, kind, parent_id)
    select uid, s.name, s.icon, p.kind, p.id
    from (values
        ('Restaurantes', 'Comida rápida', '🍔'), ('Restaurantes', 'Cafeterías', '☕'),
        ('Restaurantes', 'Bares', '🍻'),
        ('Transporte', 'Uber y Didi', '🚕'), ('Transporte', 'Transporte público', '🚇'),
        ('Transporte', 'Estacionamiento', '🅿️'), ('Transporte', 'Casetas', '🛣️'),
        ('Vivienda', 'Renta', '🔑'), ('Vivienda', 'Hipoteca', '🏦'),
        ('Vivienda', 'Mantenimiento', '🛠️'), ('Vivienda', 'Predial', '🏛️'),
        ('Servicios', 'Luz', '⚡'), ('Servicios', 'Agua', '💧'), ('Servicios', 'Gas', '🔥'),
        ('Servicios', 'Internet', '🌐'), ('Servicios', 'Celular', '📱'),
        ('Salud', 'Consultas', '🩺'), ('Salud', 'Medicinas', '💊'),
        ('Salud', 'Seguro médico', '🛡️'), ('Salud', 'Gimnasio', '🏋️'),
        ('Educación', 'Colegiaturas', '🏫'), ('Educación', 'Cursos', '📚'),
        ('Entretenimiento', 'Cine', '🍿'), ('Entretenimiento', 'Conciertos y eventos', '🎤'),
        ('Entretenimiento', 'Videojuegos', '🎮'),
        ('Suscripciones', 'Streaming', '📺'), ('Suscripciones', 'Música', '🎵'),
        ('Suscripciones', 'Software', '💻'),
        ('Viajes', 'Vuelos', '🛫'), ('Viajes', 'Hospedaje', '🏨'),
        ('Mascotas', 'Veterinario', '🐾'), ('Mascotas', 'Alimento', '🦴'),
        ('Comisiones e intereses', 'Intereses de tarjeta', '💳'),
        ('Comisiones e intereses', 'Comisiones bancarias', '🏧'),
        ('Nómina', 'Aguinaldo', '🎄'), ('Nómina', 'Bonos', '🏆')
    ) as s (parent, name, icon)
    -- Only under parents the user still has with that name; renamed or deleted ones are skipped.
    join public.categories p on p.user_id = uid and p.parent_id is null and p.name = s.parent
    on conflict do nothing
$$;

revoke execute on function public.seed_default_subcategories(uuid) from public, anon, authenticated;

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
    return new;
end
$$;

-- Existing users get them too, under whichever default parents they still have.
select public.seed_default_subcategories(id) from auth.users;
