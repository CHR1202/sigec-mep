# DESPLIEGUE DEL MÓDULO DE INVITACIONES

El sitio de GitHub Pages ya incluye el formulario de administración de
usuarios. Para que funcione, debe desplegar la Edge Function incluida.

## 1. Instalar Supabase CLI

En Windows puede usar npm:

```bash
npm install -g supabase
```

Verifique:

```bash
supabase --version
```

## 2. Iniciar sesión

Desde la terminal de Visual Studio Code:

```bash
supabase login
```

El navegador solicitará autorización.

## 3. Abrir la carpeta del proyecto

```bash
cd RUTA-DE-TU-CARPETA-SIGEC
```

## 4. Vincular el proyecto

```bash
supabase link --project-ref oadyuziwvsmgkvwwbsbm
```

Supabase puede solicitar la contraseña de la base de datos creada al inicio.

## 5. Desplegar la función

```bash
supabase functions deploy invite-sigec-user
```

La función recibe automáticamente estas variables administradas por
Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No copie la service role key en archivos ni en GitHub.

## 6. Configurar URL de redirección

En Supabase:

`Authentication → URL Configuration`

Agregue la URL pública de GitHub Pages:

```text
https://TU-USUARIO.github.io/TU-REPOSITORIO/**
```

Mientras prueba con Live Server, agregue también:

```text
http://127.0.0.1:5500/**
http://localhost:5500/**
```

## 7. Probar

1. Inicie sesión como `admin@sigec.cr`.
2. Abra `Usuarios`.
3. Presione `Invitar usuario`.
4. Complete nombre, correo y rol.
5. Para rol administrador, escriba `CONFIRMAR`.
6. Revise el correo de la persona invitada.

## Seguridad

- El navegador nunca recibe la service role key.
- La Edge Function valida el JWT del solicitante.
- La función consulta `profiles` y exige rol `admin`.
- Los roles no se asignan directamente desde GitHub Pages.
