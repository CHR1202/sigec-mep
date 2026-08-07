# SIGEC v4 - Solicitudes de acceso

Esta versión agrega el flujo solicitado sin rehacer el sistema existente.

- En el login aparece **Solicitar acceso a SIGEC**.
- La persona envía nombre, correo y rol solicitado.
- La solicitud queda pendiente en `access_requests`.
- El administrador ve **Solicitudes de Acceso**.
- **Aprobar** llama a la Edge Function `approve-access-request` que ya desplegaste.
- **Rechazar** llama a `reject_access_request`.
- Si se aprueba, Supabase invita al usuario y asigna su rol.
- Si se rechaza, no se crea ninguna cuenta.

Para GitHub Pages, reemplaza los archivos actuales por los de este ZIP.
