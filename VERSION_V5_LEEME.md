# SIGEC v5 — Solicitudes y aprobación de acceso

Esta es la versión que debe subirse a GitHub Pages.

## Qué debe verse en la página

En el LOGIN:
- Ingresar
- ¿Todavía no tiene una cuenta?
- Solicitar acceso a SIGEC

En la cuenta ADMINISTRADOR:
- Solicitudes de Acceso
- Contador de solicitudes pendientes
- Aprobar
- Rechazar
- Usuarios

## Flujo

1. La persona pulsa "Solicitar acceso a SIGEC".
2. Completa nombre, correo y rol solicitado.
3. La solicitud se guarda en `access_requests`.
4. El administrador inicia sesión.
5. Abre "Solicitudes de Acceso".
6. Al aprobar, SIGEC llama a la Edge Function `approve-access-request`.
7. Supabase envía la invitación y asigna el rol aprobado.
8. Al rechazar, no se crea la cuenta.

## Antes de subir

Debe existir en Supabase:
- tabla `access_requests`
- función SQL `reject_access_request`
- Edge Function `approve-access-request`

Si ya configuró esas tres cosas, solo debe reemplazar los archivos de GitHub Pages por los de este ZIP.
