/**
 * ============================================================
 * SUPABASE EDGE FUNCTION: invite-sigec-user
 * ============================================================
 *
 * Esta función se ejecuta en Supabase, no en GitHub Pages.
 * Usa la service_role key desde los secretos del servidor.
 *
 * Flujo:
 * 1. Atiende solicitudes POST y CORS.
 * 2. Valida el JWT del usuario que llama.
 * 3. Consulta el rol del solicitante.
 * 4. Bloquea la operación si no es admin.
 * 5. Envía una invitación con Supabase Auth Admin.
 * 6. Actualiza el perfil con nombre y rol autorizado.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type SigecRole = "admin" | "consulta" | "centro";

interface InvitePayload {
  fullName?: string;
  email?: string;
  role?: SigecRole;
  redirectTo?: string;
}

/** Respuesta JSON uniforme para éxito y error. */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ success: false, error: "Método no permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, error: "Faltan secretos del servidor." },
        500
      );
    }

    if (!authorization) {
      return jsonResponse(
        { success: false, error: "Sesión no proporcionada." },
        401
      );
    }

    /**
     * Cliente administrativo:
     * se utiliza solo dentro de la Edge Function.
     * La clave nunca se entrega al navegador.
     */
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const token = authorization.replace("Bearer ", "");

    /** Identifica al usuario que realizó la solicitud. */
    const {
      data: { user: caller },
      error: callerError
    } = await adminClient.auth.getUser(token);

    if (callerError || !caller) {
      return jsonResponse(
        { success: false, error: "La sesión no es válida." },
        401
      );
    }

    /** Comprueba el rol en la tabla pública de perfiles. */
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile) {
      return jsonResponse(
        { success: false, error: "No se encontró el perfil solicitante." },
        403
      );
    }

    if (!callerProfile.is_active || callerProfile.role !== "admin") {
      return jsonResponse(
        { success: false, error: "Solo un administrador puede invitar usuarios." },
        403
      );
    }

    const body = (await request.json()) as InvitePayload;
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role;
    const redirectTo = String(body.redirectTo || "").trim();

    if (!fullName || !email || !role) {
      return jsonResponse(
        { success: false, error: "Faltan datos obligatorios." },
        400
      );
    }

    if (!["admin", "consulta", "centro"].includes(role)) {
      return jsonResponse(
        { success: false, error: "El rol solicitado no es válido." },
        400
      );
    }

    /**
     * Envía la invitación. El trigger de SIGEC crea el perfil
     * automáticamente con rol centro.
     */
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: redirectTo || undefined
      });

    if (inviteError) {
      return jsonResponse(
        { success: false, error: inviteError.message },
        400
      );
    }

    const invitedUser = inviteData.user;

    if (!invitedUser) {
      return jsonResponse(
        { success: false, error: "Supabase no devolvió el usuario invitado." },
        500
      );
    }

    /**
     * Actualiza el perfil con el rol elegido por el administrador.
     * Se hace después de invitar para reemplazar el rol centro
     * asignado de forma segura por el trigger inicial.
     */
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role,
        is_active: true
      })
      .eq("id", invitedUser.id);

    if (updateError) {
      return jsonResponse(
        {
          success: false,
          error:
            "La invitación se creó, pero no se pudo asignar el rol: " +
            updateError.message
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      userId: invitedUser.id,
      email,
      role
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado."
      },
      500
    );
  }
});
