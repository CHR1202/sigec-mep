# SIGEC v7 — Flujo de contraseñas

Esta versión agrega:

- `set-password.html`
- `forgot-password.html`
- enlace “¿Olvidó su contraseña?” en el login.

## Cambio obligatorio en Edge Function

En `approve-access-request`, la invitación debe usar:

```ts
redirectTo: "https://chr1202.github.io/sigec-mep/set-password.html"
```

Después haga Deploy nuevamente.

## Configuración en Supabase

En `Authentication → URL Configuration`, agregue como Redirect URLs:

```text
https://chr1202.github.io/sigec-mep/**
https://chr1202.github.io/sigec-mep/set-password.html
https://chr1202.github.io/sigec-mep/forgot-password.html
```

## Flujo de usuario aprobado

1. Usuario solicita acceso.
2. Admin aprueba.
3. Supabase envía invitación.
4. Usuario abre el enlace.
5. Se abre `set-password.html`.
6. Crea y confirma su contraseña.
7. SIGEC guarda la contraseña con Supabase Auth.
8. Regresa al login.
9. Ya puede iniciar sesión.

## Recuperación

1. En login pulsa “¿Olvidó su contraseña?”.
2. Escribe su correo.
3. Supabase envía enlace.
4. Abre `set-password.html`.
5. Crea una nueva contraseña.
