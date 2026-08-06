# DOCUMENTACIÓN TÉCNICA DE SIGEC v2

## 1. Arquitectura general

SIGEC utiliza una arquitectura de tres partes:

1. **Interfaz web:** HTML, CSS y JavaScript.
2. **Servicios de Supabase:** autenticación, API de datos y almacenamiento.
3. **PostgreSQL:** tablas, relaciones, funciones, triggers y RLS.

La página puede publicarse en GitHub Pages porque no necesita ejecutar
Python, PHP ni Node.js en el servidor.

## 2. Flujo de autenticación

`app.js` ejecuta `signInWithPassword()` con el correo y la contraseña.
Supabase Auth valida la cuenta y devuelve una sesión. Después, SIGEC
consulta la tabla `profiles` para conocer el rol.

El rol no se selecciona en el login. Esto evita que una persona se declare
administradora desde la interfaz.

## 3. Roles

### Administrador

Puede consultar todos los centros, formularios e historial. Las políticas
RLS también le permiten actualizar y eliminar determinados registros.

### Consulta

Puede consultar información nacional, pero no modificarla ni limpiar el
historial.

### Centro educativo

Puede registrar su centro, guardar formularios y consultar solamente sus
propios registros.

## 4. Conexión con Supabase

`supabase-config.js` contiene:

- URL del proyecto;
- Publishable Key;
- creación del cliente `sigecSupabase`.

La Secret Key no se utiliza porque omite RLS y sería peligrosa en el
navegador.

## 5. Centros educativos

`fetchMyCenter()` consulta el centro del usuario autenticado.

El formulario `center-form` utiliza:

- `.insert()` si todavía no existe un centro;
- `.update()` si el centro ya fue registrado.

La política RLS verifica que `owner_id = auth.uid()`.

## 6. Formularios

Los formularios se guardan en `form_submissions`.

Las respuestas se almacenan en `payload`, una columna JSONB. Esto permite
modificar preguntas en años futuros sin reconstruir todas las columnas.

Tipos:

- `grupo_convivencia`
- `plan_convivencia`
- `seguimiento`

Estados:

- `borrador`
- `enviado`
- `en_revision`
- `requiere_correccion`
- `aprobado`

## 7. Archivos

`uploadAttachment()` sube el archivo al bucket privado `sigec-files`.

La ruta sigue este formato:

`UUID_USUARIO/UUID_FORMULARIO/FECHA-NOMBRE_ARCHIVO`

Después se crea una fila en `attachments` con el nombre, ruta, tipo y peso.

## 8. Dashboard

El dashboard consulta:

- centros visibles;
- formularios visibles;
- formularios enviados por tipo;
- actividad reciente.

Los resultados dependen del rol y de RLS.

## 9. Historial

Los triggers de PostgreSQL insertan eventos en `audit_log` cuando se crea,
actualiza o elimina un centro o formulario.

El administrador puede limpiar el historial desde la interfaz. La política
RLS bloquea esa acción para otros roles.

## 10. Exportación CSV

La función asociada a `export-button` consulta las respuestas permitidas y
crea un archivo CSV en el navegador. Ese archivo puede abrirse con Excel.

## 11. Seguridad

La seguridad se aplica en dos niveles:

- La interfaz oculta módulos según el rol.
- PostgreSQL aplica RLS aunque alguien modifique el HTML o JavaScript.

La segunda capa es la realmente importante.

## 12. Preparación para Power BI

Power BI puede conectarse a PostgreSQL mediante las credenciales de conexión
de Supabase. El compañero encargado debe consultar principalmente:

- `educational_centers`
- `school_periods`
- `form_submissions`

La columna `payload` puede expandirse en Power Query si necesita analizar
preguntas específicas.


## 13. Administración de usuarios

El módulo `Usuarios` consulta la tabla `profiles` y muestra nombre, correo,
rol, estado y fecha de creación.

La invitación no utiliza una Secret Key en el navegador. `app.js` invoca la
Edge Function `invite-sigec-user` mediante el token del administrador.

La Edge Function:

1. valida el JWT;
2. consulta el perfil del solicitante;
3. exige rol `admin`;
4. llama `inviteUserByEmail`;
5. actualiza el perfil con el rol seleccionado.

El rol administrador exige escribir `CONFIRMAR` en la interfaz para reducir
errores humanos. La autorización real sigue realizándose en el servidor.
