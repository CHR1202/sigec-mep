/**
 * ============================================================
 * SIGEC - CONFIGURACIÓN DE SUPABASE
 * ============================================================
 *
 * Este archivo crea un único cliente de Supabase que será usado
 * por toda la aplicación para:
 *   - autenticar usuarios;
 *   - consultar perfiles y roles;
 *   - guardar centros educativos;
 *   - guardar formularios;
 *   - consultar el historial;
 *   - subir documentos.
 *
 * La Publishable Key puede utilizarse en el navegador porque las
 * tablas están protegidas mediante Row Level Security (RLS).
 *
 * IMPORTANTE:
 * Nunca coloque aquí una Secret Key ni una service_role key.
 */

const SIGEC_SUPABASE_URL = "https://oadyuziwvsmgkvwwbsbm.supabase.co";
const SIGEC_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_RHQxs3frzGigWAkUdVX-Hg_kNj9xU5B";

/**
 * La librería cargada desde el CDN expone `window.supabase`.
 * `createClient` devuelve el objeto que comunica la página con
 * el proyecto de Supabase.
 */
const sigecSupabase = window.supabase.createClient(
  SIGEC_SUPABASE_URL,
  SIGEC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
