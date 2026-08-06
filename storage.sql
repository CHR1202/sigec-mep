-- ============================================================
-- SIGEC - CONFIGURACIÓN DE SUPABASE STORAGE
-- Ejecutar una sola vez en SQL Editor después de database.sql.
-- ============================================================

begin;

-- Crea un bucket privado para los documentos de SIGEC.
insert into storage.buckets (id, name, public, file_size_limit)
values (
  'sigec-files',
  'sigec-files',
  false,
  10485760
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760;

-- Elimina políticas anteriores para permitir volver a ejecutar.
drop policy if exists "sigec_files_owner_insert"
on storage.objects;

drop policy if exists "sigec_files_owner_select"
on storage.objects;

drop policy if exists "sigec_files_staff_select"
on storage.objects;

drop policy if exists "sigec_files_owner_delete"
on storage.objects;

drop policy if exists "sigec_files_admin_delete"
on storage.objects;

-- El primer segmento de la ruta debe ser el UUID del usuario.
create policy "sigec_files_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sigec-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- El usuario del centro puede consultar sus propios archivos.
create policy "sigec_files_owner_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sigec-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Administrador y Consulta pueden ver documentos del sistema.
create policy "sigec_files_staff_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sigec-files'
  and public.current_sigec_role() in ('admin', 'consulta')
);

-- El propietario puede eliminar un archivo que subió.
create policy "sigec_files_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sigec-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- El administrador puede eliminar cualquier archivo del bucket.
create policy "sigec_files_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sigec-files'
  and public.current_sigec_role() = 'admin'
);

commit;
