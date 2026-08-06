# MANUAL DE INSTALACIÓN

## Paso 1. Ejecutar Storage

En Supabase:

1. Abra `SQL Editor`.
2. Cree una consulta nueva.
3. Copie todo el contenido de `storage.sql`.
4. Presione `Run`.
5. Verifique en `Storage` que exista el bucket privado `sigec-files`.

## Paso 2. Crear usuarios de prueba

En `Authentication → Users`, cree las cuentas necesarias.

Todo usuario nuevo empieza con rol `centro`.

Para crear una cuenta de consulta:

```sql
update public.profiles
set role = 'consulta',
    full_name = 'Usuario de Consulta'
where email = 'CORREO_AQUI';
```

Para crear una cuenta administradora:

```sql
update public.profiles
set role = 'admin',
    full_name = 'Administrador SIGEC'
where email = 'CORREO_AQUI';
```

## Paso 3. Instalar archivos

1. Descomprima el ZIP.
2. Copie todo el contenido a la carpeta de la pasantía.
3. Reemplace los archivos anteriores.
4. Abra la carpeta en Visual Studio Code.
5. Ejecute `index.html` con Live Server.

## Paso 4. Probar

### Como centro

1. Inicie sesión con una cuenta de rol `centro`.
2. Registre los datos del centro.
3. Guarde un borrador.
4. Envíe el formulario.

### Como administrador

1. Cierre sesión.
2. Ingrese con `admin@sigec.cr`.
3. Revise Dashboard, Centros, Respuestas e Historial.

## GitHub Pages

Cuando funcione localmente:

1. Suba todos los archivos al repositorio.
2. Abra `Settings → Pages`.
3. Seleccione `Deploy from a branch`.
4. Elija `main` y `/root`.
5. Guarde.

No suba ninguna Secret Key.
