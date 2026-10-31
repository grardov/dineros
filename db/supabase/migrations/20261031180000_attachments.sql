-- Images and documents embedded in transaction notes. Private: there are no public or signed URLs;
-- core reads and writes them with the user's own JWT, so these policies are what scope access.
-- Objects live at <user_id>/<uuid>.<ext>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'attachments',
    'attachments',
    false,
    4194304, -- 4 MiB, under Vercel's 4.5 MB request body limit (uploads pass through web)
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

create policy "Users manage their own attachments"
on storage.objects for all to authenticated
using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
