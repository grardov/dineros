-- Tags were only cleaned up in the browser, so anything writing straight to the API or table could
-- store "#Viaje", "fin de semana" or "" (shown as "##Viaje", split in two by the CSV export).
-- Normalized here for every writer, with the same rules as the web's tag input: no leading # or
-- surrounding spaces, inner spaces as "-", lowercase, no empty or repeated tags (first one kept).
create function public.normalize_tags(tags text[]) returns text[]
language sql immutable set search_path = '' as $$
    select coalesce(array_agg(tag order by i), '{}')
    from (
        select distinct on (tag) tag, i
        from unnest(tags) with ordinality as u(raw, i),
            lateral (select lower(regexp_replace(
                regexp_replace(raw, '^[#[:space:]]+|[[:space:]]+$', '', 'g'),
                '[[:space:]]+', '-', 'g'
            ))) as n(tag)
        where tag <> ''
        order by tag, i
    ) s
$$;

create function public.normalize_transaction_tags() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.tags := public.normalize_tags(new.tags);
    return new;
end
$$;

create trigger normalize_tags before insert or update of tags on public.transactions
    for each row execute function public.normalize_transaction_tags();

update public.transactions set tags = public.normalize_tags(tags)
where tags is distinct from public.normalize_tags(tags);
