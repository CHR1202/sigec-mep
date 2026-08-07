# SIGEC v6 — Corrección del botón Solicitar acceso

Esta versión corrige el problema donde el botón era visible pero no abría el formulario.

Cambios:
- apertura del modal reforzada directamente desde HTML;
- cierre del modal reforzado;
- `?v=6` agregado a CSS y JavaScript para impedir que GitHub Pages o el navegador usen archivos viejos en caché;
- se conserva toda la integración anterior con Supabase, solicitudes, aprobación y rechazo.

Después de subir los archivos:
1. Espere a que GitHub Pages termine el deployment.
2. Abra la página.
3. Presione Ctrl + F5 para forzar una recarga completa.
4. El botón `Solicitar acceso a SIGEC` debe abrir el formulario.
