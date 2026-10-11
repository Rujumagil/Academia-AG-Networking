update storage.buckets
set public=false
where id='avatars';

drop policy if exists academy_avatars_public_read on storage.objects;
drop policy if exists academy_avatars_private_read on storage.objects;

create policy academy_avatars_private_read
on storage.objects
for select
to authenticated
using (
  bucket_id='avatars'
  and case
    when coalesce((storage.foldername(name))[1],'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.academy_can_view_profile(((storage.foldername(name))[1])::uuid)
    else false
  end
);

update public.ecosystem_project_registry
set
  metadata=metadata || '{"academy_avatars_private":true,"academy_avatar_delivery":"signed_url"}'::jsonb,
  updated_at=now()
where project_key='ag-business-networking';
