# SIGEC v2 — Supabase

Sistema de Gestión de Convivencia Escolar conectado a Supabase.

## Archivos principales

- `index.html`: estructura visual de la aplicación.
- `styles.css`: diseño y adaptación para celular.
- `supabase-config.js`: URL, Publishable Key y cliente de Supabase.
- `app.js`: autenticación, navegación, formularios y consultas.
- `storage.sql`: crea el bucket privado para documentos.
- `DOCUMENTACION_TECNICA.md`: explicación detallada del código.
- `MANUAL_INSTALACION.md`: pasos para instalar y probar el sistema.
- `MANUAL_USUARIO.md`: instrucciones para cada rol.

## Importante

La Publishable Key puede estar en el navegador porque las tablas están
protegidas con RLS. Nunca coloque una Secret Key dentro de estos archivos.

## Antes de probar

1. Ejecute `storage.sql` en Supabase SQL Editor.
2. Cree al menos un usuario `centro` en Authentication.
3. Abra `index.html` mediante Live Server.
4. Inicie sesión con una cuenta creada en Supabase.


## Módulo de invitaciones

La carpeta `supabase/functions/invite-sigec-user/` contiene una Edge Function
segura para que el administrador invite cuentas de centro, consulta o
administración desde la propia página.

Lea `DESPLIEGUE_EDGE_FUNCTION.md` antes de probar esta opción.
