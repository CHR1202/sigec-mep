/**
 * ============================================================
 * SIGEC - APLICACIÓN PRINCIPAL CON SUPABASE
 * ============================================================
 *
 * Responsabilidades de este archivo:
 * 1. Gestionar el inicio y cierre de sesión.
 * 2. Consultar el perfil y el rol del usuario autenticado.
 * 3. Mostrar únicamente los módulos permitidos para cada rol.
 * 4. Registrar y actualizar centros educativos.
 * 5. Guardar formularios de Grupo y Plan de Convivencia.
 * 6. Subir archivos al almacenamiento privado de Supabase.
 * 7. Consultar respuestas, indicadores e historial.
 * 8. Exportar las respuestas visibles a CSV.
 *
 * La seguridad real no depende únicamente de ocultar botones.
 * Las políticas RLS de PostgreSQL deciden qué filas puede leer o
 * modificar cada usuario, incluso si alguien altera el navegador.
 */

/* ------------------------------------------------------------
 * 1. UTILIDADES GENERALES
 * ---------------------------------------------------------- */

/** Atajo para obtener un elemento por su id. */
const $ = (id) => document.getElementById(id);

/** Atajo para convertir una selección de elementos en un arreglo. */
const qsa = (selector) => [...document.querySelectorAll(selector)];

/**
 * Estado temporal de la aplicación.
 * No contiene contraseñas ni claves secretas.
 */
const state = {
  session: null,
  user: null,
  profile: null,
  center: null,
  period: null,
  records: [],
  history: [],
  users: []
};

/** Títulos que aparecen en la barra superior. */
const titles = {
  dashboard: "Dashboard",
  centros: "Centros Educativos",
  "grupo-consulta": "Grupo de Convivencia",
  "plan-consulta": "Plan de Convivencia",
  seguimientos: "Seguimientos",
  respuestas: "Respuestas / Consultas",
  usuarios: "Usuarios",
  historial: "Historial de Cambios",
  reportes: "Reportes",
  "datos-centro": "Datos del Centro",
  grupo: "Grupo de Convivencia",
  plan: "Plan de Convivencia",
  "mis-envios": "Mis Envíos"
};

const loginView = $("login-view");
const systemView = $("system-view");
const loginForm = $("login-form");
const toast = $("toast");

/** Convierte caracteres especiales en texto seguro para HTML. */
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

/** Muestra una notificación temporal en la esquina inferior. */
function showToast(message, type = "info") {
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.remove("hidden");
  window.setTimeout(() => toast.classList.add("hidden"), 3200);
}

/** Cambia el indicador visual de conexión. */
function setConnectionStatus(text, connected = true) {
  const indicator = $("connection-status");
  if (!indicator) return;
  indicator.textContent = text;
  indicator.classList.toggle("offline", !connected);
}

/** Devuelve un mensaje legible a partir de un error de Supabase. */
function readableError(error, fallback = "Ocurrió un error inesperado.") {
  console.error(error);
  if (!error) return fallback;

  const message = String(error.message || error);
  const translations = {
    "Invalid login credentials": "Correo o contraseña incorrectos.",
    "Email not confirmed": "El correo todavía no ha sido confirmado.",
    "User not found": "El usuario no existe.",
    "Failed to fetch": "No fue posible conectarse con Supabase."
  };

  return translations[message] || message || fallback;
}

/** Activa o desactiva un botón durante una operación asíncrona. */
function setButtonLoading(button, loading, loadingText = "Procesando…") {
  if (!button) return;

  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}`;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml || button.innerHTML;
  }
}

/** Formatea la fecha para mostrarla en la interfaz. */
function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

/** Coloca la fecha actual en el dashboard. */
function setCurrentDate() {
  const formatter = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const value = formatter.format(new Date());
  $("current-date").textContent =
    value.charAt(0).toUpperCase() + value.slice(1);
}

/** Genera las opciones de circuito 01 a 14. */
function buildCircuitOptions() {
  const circuit = $("circuit");
  if (!circuit || circuit.options.length > 1) return;

  for (let number = 1; number <= 14; number += 1) {
    const option = document.createElement("option");
    option.value = String(number).padStart(2, "0");
    option.textContent = option.value;
    circuit.appendChild(option);
  }
}

/* ------------------------------------------------------------
 * 2. AUTENTICACIÓN Y ROLES
 * ---------------------------------------------------------- */

/**
 * Consulta el perfil asociado al usuario de Supabase Auth.
 * El perfil contiene el nombre, el rol y el estado de la cuenta.
 */
async function fetchProfile(userId) {
  const { data, error } = await sigecSupabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (!data.is_active) {
    throw new Error("Esta cuenta se encuentra desactivada.");
  }

  return data;
}

/** Muestra u oculta opciones de acuerdo con el rol. */
function setRoleVisibility(role) {
  qsa(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", role !== "admin");
  });

  qsa(".staff-only").forEach((element) => {
    element.classList.toggle("hidden", role === "centro");
  });

  qsa(".center-only").forEach((element) => {
    element.classList.toggle("hidden", role !== "centro");
  });
}

/** Cambia la sección principal que está visible. */
async function showView(viewId) {
  qsa(".content-view").forEach((section) => {
    section.classList.toggle("hidden", section.id !== viewId);
  });

  qsa(".nav-link[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  $("page-title").textContent = titles[viewId] || "SIGEC";

  try {
    await refreshDataForView(viewId);
  } catch (error) {
    showToast(readableError(error), "error");
  }
}

/**
 * Abre el sistema después de validar la sesión y el perfil.
 */
async function openSystem(session) {
  state.session = session;
  state.user = session.user;
  state.profile = await fetchProfile(session.user.id);

  loginView.classList.add("hidden");
  systemView.classList.remove("hidden");

  const roleNames = {
    admin: "Administrador",
    consulta: "Consulta",
    centro: "Centro educativo"
  };

  $("current-role").textContent = roleNames[state.profile.role];
  setRoleVisibility(state.profile.role);
  setConnectionStatus("Supabase conectado", true);

  await fetchOpenPeriod();
  await fetchMyCenter();

  const initialView =
    state.profile.role === "centro" ? "datos-centro" : "dashboard";

  await showView(initialView);
}

/** Regresa a la pantalla de acceso y limpia el estado local. */
function closeSystem() {
  state.session = null;
  state.user = null;
  state.profile = null;
  state.center = null;
  state.period = null;
  state.records = [];
  state.history = [];

  systemView.classList.add("hidden");
  loginView.classList.remove("hidden");
  loginForm.reset();
}

/**
 * Inicia sesión mediante correo y contraseña.
 * Supabase verifica las credenciales; la página nunca recibe la
 * contraseña almacenada en el servidor.
 */
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;
  const button = loginForm.querySelector('button[type="submit"]');

  if (!email || !password) {
    showToast("Complete el correo y la contraseña.", "error");
    return;
  }

  setButtonLoading(button, true, "Ingresando…");

  try {
    const { data, error } = await sigecSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    await openSystem(data.session);
    showToast("Sesión iniciada correctamente.", "success");
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    setButtonLoading(button, false);
  }
});

/** Permite mostrar u ocultar la contraseña escrita. */
$("toggle-password").addEventListener("click", () => {
  const input = $("password");
  input.type = input.type === "password" ? "text" : "password";
});

/** Cierra la sesión tanto en Supabase como en la interfaz. */
$("logout-button").addEventListener("click", async () => {
  const { error } = await sigecSupabase.auth.signOut();

  if (error) {
    showToast(readableError(error), "error");
    return;
  }

  closeSystem();
  showToast("Sesión cerrada.", "success");
});

/**
 * Supabase informa cuando cambia la autenticación.
 * Esto permite restaurar una sesión al recargar la página.
 */
sigecSupabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    closeSystem();
  }

  if (event === "TOKEN_REFRESHED") {
    state.session = session;
  }
});

/* ------------------------------------------------------------
 * 3. NAVEGACIÓN
 * ---------------------------------------------------------- */

$("sidebar-toggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("collapsed");
});

qsa("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

qsa("[data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    let target = button.dataset.viewJump;

    if (state.profile?.role === "centro") {
      if (target === "centros") target = "datos-centro";
      if (target === "grupo-consulta") target = "grupo";
      if (target === "plan-consulta") target = "plan";
      if (target === "respuestas") target = "mis-envios";
    }

    showView(target);
  });
});

/* ------------------------------------------------------------
 * 4. PERIODO Y CENTRO EDUCATIVO
 * ---------------------------------------------------------- */

/** Obtiene el periodo abierto; para este prototipo será 2026. */
async function fetchOpenPeriod() {
  const { data, error } = await sigecSupabase
    .from("school_periods")
    .select("id, year, is_open")
    .eq("is_open", true)
    .order("year", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  state.period = data;
}

/**
 * Busca el centro perteneciente al usuario autenticado.
 * RLS evita que un centro vea información de otros centros.
 */
async function fetchMyCenter() {
  if (!state.user) return null;

  const { data, error } = await sigecSupabase
    .from("educational_centers")
    .select("*")
    .eq("owner_id", state.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  state.center = data || null;
  fillCenterForm();
  return state.center;
}

/** Copia los datos del centro existente dentro del formulario. */
function fillCenterForm() {
  const center = state.center;
  if (!center) return;

  $("centerName").value = center.name || "";
  $("budgetCode").value = center.budget_code || "";
  $("region").value = center.region_name || "";
  $("circuit").value = center.circuit_code || "";
  $("modality").value = center.modality || "";
  $("contactName").value = center.coordinator_name || "";
  $("contactEmail").value = center.coordinator_email || "";
}

/** Lee los datos escritos en el formulario de centro. */
function getCenterPayload() {
  return {
    owner_id: state.user.id,
    budget_code: $("budgetCode").value.trim(),
    name: $("centerName").value.trim(),
    region_name: $("region").value.trim(),
    circuit_code: $("circuit").value,
    modality: $("modality").value,
    coordinator_name: $("contactName").value.trim(),
    coordinator_email: $("contactEmail").value.trim()
  };
}

/**
 * Inserta el centro la primera vez o actualiza el registro existente.
 */
$("center-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.profile.role !== "centro") {
    showToast("Solo una cuenta de centro puede registrar estos datos.", "error");
    return;
  }

  const payload = getCenterPayload();
  const button = event.submitter;

  if (!/^\d{4}$/.test(payload.budget_code)) {
    showToast("El código presupuestario debe contener cuatro dígitos.", "error");
    return;
  }

  setButtonLoading(button, true, "Guardando…");

  try {
    let query;

    if (state.center) {
      query = sigecSupabase
        .from("educational_centers")
        .update(payload)
        .eq("id", state.center.id)
        .select()
        .single();
    } else {
      query = sigecSupabase
        .from("educational_centers")
        .insert(payload)
        .select()
        .single();
    }

    const { data, error } = await query;
    if (error) throw error;

    state.center = data;
    showToast("Datos del centro guardados.", "success");
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    setButtonLoading(button, false);
  }
});

/* ------------------------------------------------------------
 * 5. FORMULARIOS
 * ---------------------------------------------------------- */

/** Devuelve los valores marcados en un grupo de casillas. */
function checked(name) {
  return qsa(`input[name="${name}"]:checked`)
    .map((input) => input.value);
}

/** Devuelve el valor seleccionado en un grupo de radio botones. */
function radio(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

/** Verifica que exista un centro antes de guardar formularios. */
async function requireCenter() {
  if (!state.center) await fetchMyCenter();

  if (!state.center) {
    showToast("Primero guarde los datos del centro educativo.", "error");
    await showView("datos-centro");
    return null;
  }

  return state.center;
}

/** Valida que los totales de estudiantes sean coherentes. */
function validateStudentCounts() {
  const total = Number($("studentTotal").value);
  const male = Number($("maleStudents").value);
  const female = Number($("femaleStudents").value);

  if (male + female !== total) {
    showToast(
      "La suma de estudiantes hombres y mujeres debe coincidir con el total.",
      "error"
    );
    return false;
  }

  const ageTotal = [
    "ageEarly", "ageChild", "ageTeen", "ageYouth", "ageAdult"
  ].reduce((sum, id) => sum + Number($(id).value || 0), 0);

  if (ageTotal !== total) {
    showToast(
      "La suma por grupos etarios debe coincidir con el total.",
      "error"
    );
    return false;
  }

  return true;
}

/** Construye el objeto JSON del formulario Grupo de Convivencia. */
function getGroupPayload() {
  return {
    hasGroup: radio("hasGroup"),
    directorMember: radio("directorMember"),
    studentTotal: Number($("studentTotal").value),
    maleStudents: Number($("maleStudents").value),
    femaleStudents: Number($("femaleStudents").value),
    staffCount: Number($("staffCount").value),
    ages: {
      early: Number($("ageEarly").value),
      child: Number($("ageChild").value),
      teen: Number($("ageTeen").value),
      youth: Number($("ageYouth").value),
      adult: Number($("ageAdult").value)
    },
    otherMembers: checked("otherMembers")
  };
}

/** Construye el objeto JSON del formulario Plan de Convivencia. */
function getPlanPayload() {
  return {
    diagnosisDone: radio("diagnosisDone"),
    tools: checked("tools"),
    diagnosisUsed: radio("diagnosisUsed"),
    hasPlan: radio("hasPlan"),
    strategies: checked("strategies"),
    violence: checked("violence"),
    risks: checked("risks"),
    otherRisk: $("otherRisk").value.trim(),
    studentProposals: radio("studentProposals"),
    studentInvolvement: Number($("studentInvolvement").value)
  };
}

/**
 * Busca un formulario anual existente del mismo tipo.
 * El esquema evita duplicados por centro, periodo y tipo.
 */
async function findExistingSubmission(formType) {
  const { data, error } = await sigecSupabase
    .from("form_submissions")
    .select("id, status")
    .eq("center_id", state.center.id)
    .eq("period_id", state.period.id)
    .eq("form_type", formType)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Guarda un borrador o envío.
 * Si existe un borrador, se actualiza; de lo contrario, se inserta.
 */
async function saveSubmission({
  formType,
  status,
  payload,
  fileInput,
  submitButton
}) {
  const center = await requireCenter();
  if (!center) return false;

  setButtonLoading(submitButton, true, status === "enviado" ? "Enviando…" : "Guardando…");

  try {
    const existing = await findExistingSubmission(formType);
    let submission;

    const row = {
      center_id: center.id,
      submitted_by: state.user.id,
      period_id: state.period.id,
      form_type: formType,
      status,
      payload,
      submitted_at: status === "enviado" ? new Date().toISOString() : null
    };

    if (existing) {
      if (!["borrador", "requiere_correccion"].includes(existing.status)) {
        throw new Error(
          "Este formulario ya fue enviado y no puede modificarse desde esta cuenta."
        );
      }

      const { data, error } = await sigecSupabase
        .from("form_submissions")
        .update(row)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      submission = data;
    } else {
      const { data, error } = await sigecSupabase
        .from("form_submissions")
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      submission = data;
    }

    const file = fileInput?.files?.[0];
    if (file) {
      await uploadAttachment(file, submission.id);
    }

    showToast(
      status === "enviado"
        ? "Formulario enviado correctamente."
        : "Borrador guardado.",
      "success"
    );

    return true;
  } catch (error) {
    showToast(readableError(error), "error");
    return false;
  } finally {
    setButtonLoading(submitButton, false);
  }
}

/**
 * Sube un archivo al bucket privado `sigec-files` y registra sus
 * metadatos en la tabla attachments.
 */
async function uploadAttachment(file, submissionId) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath =
    `${state.user.id}/${submissionId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await sigecSupabase.storage
    .from("sigec-files")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { error: metadataError } = await sigecSupabase
    .from("attachments")
    .insert({
      submission_id: submissionId,
      uploaded_by: state.user.id,
      original_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size
    });

  if (metadataError) throw metadataError;
}

/** Envío del formulario Grupo. */
$("group-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateStudentCounts()) return;

  if (checked("otherMembers").length === 0) {
    showToast(
      "Seleccione al menos una opción en otras personas integrantes.",
      "error"
    );
    return;
  }

  const saved = await saveSubmission({
    formType: "grupo_convivencia",
    status: "enviado",
    payload: getGroupPayload(),
    fileInput: $("groupFile"),
    submitButton: event.submitter
  });

  if (saved) event.target.reset();
});

/** Envío del formulario Plan. */
$("plan-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (checked("tools").length === 0) {
    showToast("Seleccione al menos una herramienta de diagnóstico.", "error");
    return;
  }

  if (checked("strategies").length !== 3) {
    showToast("Seleccione exactamente tres líneas estratégicas.", "error");
    return;
  }

  if (checked("violence").length !== 2) {
    showToast(
      "Seleccione exactamente dos manifestaciones de violencia.",
      "error"
    );
    return;
  }

  if (checked("risks").length === 0) {
    showToast(
      "Seleccione al menos una situación de vulnerabilidad o riesgo.",
      "error"
    );
    return;
  }

  const saved = await saveSubmission({
    formType: "plan_convivencia",
    status: "enviado",
    payload: getPlanPayload(),
    fileInput: $("planFile"),
    submitButton: event.submitter
  });

  if (saved) {
    event.target.reset();
    $("involvementValue").textContent = "5";
  }
});

/** Guardado manual de borradores. */
qsa("[data-save]").forEach((button) => {
  button.addEventListener("click", async () => {
    const isGroup = button.dataset.save === "group";

    await saveSubmission({
      formType: isGroup ? "grupo_convivencia" : "plan_convivencia",
      status: "borrador",
      payload: isGroup ? getGroupPayload() : getPlanPayload(),
      fileInput: isGroup ? $("groupFile") : $("planFile"),
      submitButton: button
    });
  });
});

$("studentInvolvement").addEventListener("input", (event) => {
  $("involvementValue").textContent = event.target.value;
});

/* ------------------------------------------------------------
 * 6. CONSULTAS Y DASHBOARD
 * ---------------------------------------------------------- */

/**
 * Obtiene formularios visibles según RLS.
 * Admin y Consulta ven todos; Centro únicamente los suyos.
 */
async function fetchSubmissions() {
  const { data, error } = await sigecSupabase
    .from("form_submissions")
    .select(`
      id,
      form_type,
      status,
      submitted_at,
      created_at,
      submitted_by,
      payload,
      educational_centers (
        id,
        budget_code,
        name,
        region_name,
        circuit_code,
        modality,
        coordinator_email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  state.records = data || [];
  return state.records;
}

/** Obtiene los centros visibles para el rol actual. */
async function fetchCenters() {
  const { data, error } = await sigecSupabase
    .from("educational_centers")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

/** Obtiene el historial, disponible únicamente para admin por RLS. */
async function fetchHistory() {
  if (state.profile.role !== "admin") return [];

  const { data, error } = await sigecSupabase
    .from("audit_log")
    .select("id, user_id, action, table_name, record_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  state.history = data || [];
  return state.history;
}

/** HTML para una tabla sin registros. */
function emptyRow(columns, message) {
  return `<tr><td class="empty-row" colspan="${columns}">${message}</td></tr>`;
}

/** Traduce los valores técnicos a etiquetas legibles. */
function formLabel(formType) {
  return {
    grupo_convivencia: "Grupo de convivencia",
    plan_convivencia: "Plan de convivencia",
    seguimiento: "Seguimiento"
  }[formType] || formType;
}

function statusLabel(status) {
  return {
    borrador: "Borrador",
    enviado: "Enviado",
    en_revision: "En revisión",
    requiere_correccion: "Requiere corrección",
    aprobado: "Aprobado"
  }[status] || status;
}

/** Actualiza las tarjetas y la actividad del dashboard. */
function renderDashboard(records, centers) {
  const sent = records.filter((record) => record.status === "enviado");

  $("stat-centros").textContent = centers.length;
  $("stat-grupos").textContent =
    sent.filter((record) => record.form_type === "grupo_convivencia").length;
  $("stat-planes").textContent =
    sent.filter((record) => record.form_type === "plan_convivencia").length;
  $("stat-seguimientos").textContent =
    sent.filter((record) => record.form_type === "seguimiento").length;

  const container = $("activity-content");

  if (!records.length) {
    container.className = "empty-activity";
    container.innerHTML = `
      <div class="folder-illustration">
        <i class="fa-solid fa-folder"></i>
      </div>
      <h4>Aún no hay actividad registrada</h4>
      <p>Cuando se envíen formularios o se realicen acciones,<br>aparecerán aquí.</p>
    `;
    return;
  }

  container.className = "activity-list";
  container.innerHTML = records.slice(0, 4).map((record) => {
    const center = record.educational_centers;
    return `
      <div class="activity-item">
        <i class="fa-regular fa-file-lines"></i>
        <div>
          <strong>
            ${escapeHtml(formLabel(record.form_type))}
            — ${escapeHtml(center?.name || "Centro")}
          </strong>
          <span>
            ${escapeHtml(statusLabel(record.status))}
            · ${escapeHtml(formatDate(record.submitted_at || record.created_at))}
          </span>
        </div>
      </div>
    `;
  }).join("");
}

/** Renderiza la tabla de centros. */
function renderCenters(centers) {
  const search = ($("center-search")?.value || "").trim().toLowerCase();

  const filtered = centers.filter((center) =>
    center.name.toLowerCase().includes(search) ||
    center.budget_code.toLowerCase().includes(search)
  );

  $("centros-table").innerHTML = filtered.length
    ? filtered.map((center) => `
        <tr>
          <td>${escapeHtml(center.budget_code)}</td>
          <td>${escapeHtml(center.name)}</td>
          <td>${escapeHtml(center.region_name)}</td>
          <td>${escapeHtml(center.circuit_code)}</td>
          <td>${escapeHtml(center.modality)}</td>
        </tr>
      `).join("")
    : emptyRow(5, "No hay centros registrados.");
}

/** Genera filas para las tablas de Grupo y Plan. */
function renderFormTable(records, tableId, type) {
  const filtered = records.filter((record) => record.form_type === type);

  $(tableId).innerHTML = filtered.length
    ? filtered.map((record) => {
        const center = record.educational_centers;
        return `
          <tr>
            <td>${escapeHtml(formatDate(record.submitted_at || record.created_at))}</td>
            <td>${escapeHtml(center?.name || "—")}</td>
            <td>${escapeHtml(center?.budget_code || "—")}</td>
            <td>${escapeHtml(statusLabel(record.status))}</td>
            <td>${escapeHtml(center?.coordinator_email || "—")}</td>
          </tr>
        `;
      }).join("")
    : emptyRow(5, "No hay registros.");
}

/** Renderiza todas las respuestas visibles. */
function renderResponses(records) {
  $("responses-table").innerHTML = records.length
    ? records.map((record) => {
        const center = record.educational_centers;
        return `
          <tr>
            <td>${escapeHtml(formatDate(record.submitted_at || record.created_at))}</td>
            <td>${escapeHtml(center?.name || "—")}</td>
            <td>${escapeHtml(center?.budget_code || "—")}</td>
            <td>${escapeHtml(formLabel(record.form_type))}</td>
            <td>${escapeHtml(statusLabel(record.status))}</td>
            <td>${escapeHtml(center?.coordinator_email || "—")}</td>
          </tr>
        `;
      }).join("")
    : emptyRow(6, "No hay respuestas registradas.");
}

/** Renderiza los envíos pertenecientes al centro autenticado. */
function renderMySubmissions(records) {
  $("my-submissions-table").innerHTML = records.length
    ? records.map((record) => {
        const center = record.educational_centers;
        return `
          <tr>
            <td>${escapeHtml(formatDate(record.submitted_at || record.created_at))}</td>
            <td>${escapeHtml(formLabel(record.form_type))}</td>
            <td>${escapeHtml(center?.name || "—")}</td>
            <td>${escapeHtml(statusLabel(record.status))}</td>
          </tr>
        `;
      }).join("")
    : emptyRow(4, "No hay envíos asociados a esta cuenta.");
}

/** Renderiza el historial técnico. */
function renderHistory(history) {
  $("history-table").innerHTML = history.length
    ? history.map((item) => `
        <tr>
          <td>${escapeHtml(formatDate(item.created_at))}</td>
          <td>${escapeHtml(item.user_id || "Sistema")}</td>
          <td>${escapeHtml(item.action)}</td>
          <td>
            ${escapeHtml(item.table_name)}
            ${item.record_id ? `— ${escapeHtml(item.record_id)}` : ""}
          </td>
        </tr>
      `).join("")
    : emptyRow(4, "No hay actividad registrada.");
}

/**
 * Carga únicamente los datos necesarios para la vista solicitada.
 */
async function refreshDataForView(viewId) {
  if (!state.profile) return;

  if (viewId === "datos-centro") {
    await fetchMyCenter();
    return;
  }

  if (["dashboard", "centros"].includes(viewId)) {
    const [records, centers] = await Promise.all([
      fetchSubmissions(),
      fetchCenters()
    ]);

    renderDashboard(records, centers);
    renderCenters(centers);
    return;
  }

  if ([
    "grupo-consulta",
    "plan-consulta",
    "respuestas",
    "mis-envios"
  ].includes(viewId)) {
    const records = await fetchSubmissions();
    renderFormTable(records, "group-table", "grupo_convivencia");
    renderFormTable(records, "plan-table", "plan_convivencia");
    renderResponses(records);
    renderMySubmissions(records);
    return;
  }

  if (viewId === "usuarios") {
    renderUsers(await fetchUsers());
    return;
  }

  if (viewId === "historial") {
    renderHistory(await fetchHistory());
  }
}

$("center-search").addEventListener("input", async () => {
  try {
    renderCenters(await fetchCenters());
  } catch (error) {
    showToast(readableError(error), "error");
  }
});

/* ------------------------------------------------------------
 * 7. EXPORTACIÓN Y LIMPIEZA DEL HISTORIAL
 * ---------------------------------------------------------- */

/** Exporta a CSV las respuestas visibles para el usuario actual. */
$("export-button").addEventListener("click", async () => {
  try {
    const records = await fetchSubmissions();

    if (!records.length) {
      showToast("No hay registros para exportar.", "error");
      return;
    }

    const rows = [
      [
        "Fecha",
        "Centro",
        "Código",
        "Región",
        "Circuito",
        "Modalidad",
        "Formulario",
        "Estado",
        "Correo"
      ],
      ...records.map((record) => {
        const center = record.educational_centers || {};
        return [
          formatDate(record.submitted_at || record.created_at),
          center.name || "",
          center.budget_code || "",
          center.region_name || "",
          center.circuit_code || "",
          center.modality || "",
          formLabel(record.form_type),
          statusLabel(record.status),
          center.coordinator_email || ""
        ];
      })
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sigec_respuestas.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(readableError(error), "error");
  }
});

/**
 * El administrador puede limpiar el historial.
 * La política RLS impide que otros roles ejecuten esta eliminación.
 */
const clearHistoryButton = $("clear-history-button");

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "¿Está seguro de que desea eliminar todo el historial? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    try {
      const { error } = await sigecSupabase
        .from("audit_log")
        .delete()
        .gte("id", 0);

      if (error) throw error;

      renderHistory([]);
      showToast("El historial fue eliminado.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    }
  });
}

/* ------------------------------------------------------------
 * 8. ADMINISTRACIÓN DE USUARIOS
 * ---------------------------------------------------------- */

/**
 * Consulta los perfiles visibles para el administrador.
 * La política RLS permite esta lectura únicamente a admin y consulta.
 * La interfaz del módulo solo se muestra al rol administrador.
 */
async function fetchUsers() {
  if (state.profile?.role !== "admin") {
    throw new Error("Solo un administrador puede consultar este módulo.");
  }

  const { data, error } = await sigecSupabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  state.users = data || [];
  return state.users;
}

/** Traduce el valor técnico del rol a una etiqueta legible. */
function roleLabel(role) {
  return {
    admin: "Administrador",
    consulta: "Consulta y seguimiento",
    centro: "Centro educativo"
  }[role] || role;
}

/** Dibuja la tabla de usuarios aplicando búsqueda y filtro. */
function renderUsers(users = state.users) {
  const search = ($("user-search")?.value || "").trim().toLowerCase();
  const roleFilter = $("user-role-filter")?.value || "";

  const filtered = users.filter((user) => {
    const matchesText =
      String(user.full_name || "").toLowerCase().includes(search) ||
      String(user.email || "").toLowerCase().includes(search);

    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesText && matchesRole;
  });

  $("users-table").innerHTML = filtered.length
    ? filtered.map((user) => `
        <tr>
          <td>${escapeHtml(user.full_name || "Sin nombre")}</td>
          <td>${escapeHtml(user.email || "—")}</td>
          <td>
            <span class="role-badge role-${escapeHtml(user.role)}">
              ${escapeHtml(roleLabel(user.role))}
            </span>
          </td>
          <td>
            <span class="status-badge ${user.is_active ? "active" : "inactive"}">
              ${user.is_active ? "Activo" : "Inactivo"}
            </span>
          </td>
          <td>${escapeHtml(formatDate(user.created_at))}</td>
        </tr>
      `).join("")
    : emptyRow(5, "No se encontraron usuarios.");
}

/** Abre el formulario modal de invitación. */
function openInviteModal() {
  $("invite-user-modal").classList.remove("hidden");
  $("invite-full-name").focus();
}

/** Cierra el modal y restablece sus campos. */
function closeInviteModal() {
  $("invite-user-modal").classList.add("hidden");
  $("invite-user-form").reset();
  $("admin-confirmation-field").classList.add("hidden");
  $("admin-confirmation").required = false;
}

$("open-invite-modal")?.addEventListener("click", openInviteModal);
$("close-invite-modal")?.addEventListener("click", closeInviteModal);
$("cancel-invite")?.addEventListener("click", closeInviteModal);

$("invite-user-modal")?.addEventListener("click", (event) => {
  if (event.target.id === "invite-user-modal") closeInviteModal();
});

/**
 * Cuando se selecciona el rol admin exige una confirmación explícita.
 * Esto reduce ascensos accidentales, aunque la seguridad real permanece
 * en la Edge Function y en PostgreSQL.
 */
$("invite-role")?.addEventListener("change", (event) => {
  const isAdmin = event.target.value === "admin";
  $("admin-confirmation-field").classList.toggle("hidden", !isAdmin);
  $("admin-confirmation").required = isAdmin;

  if (!isAdmin) $("admin-confirmation").value = "";
});

/**
 * Invoca la Edge Function segura `invite-sigec-user`.
 *
 * El navegador envía el token de la sesión actual. La función:
 * 1. verifica el token;
 * 2. confirma que el solicitante sea administrador;
 * 3. invita el correo mediante la API administrativa;
 * 4. asigna el rol solicitado en profiles.
 */
$("invite-user-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = $("invite-full-name").value.trim();
  const email = $("invite-email").value.trim().toLowerCase();
  const role = $("invite-role").value;
  const confirmation = $("admin-confirmation").value.trim();
  const button = event.submitter;

  if (!fullName || !email || !role) {
    showToast("Complete todos los campos obligatorios.", "error");
    return;
  }

  if (role === "admin" && confirmation !== "CONFIRMAR") {
    showToast("Escriba CONFIRMAR para autorizar el rol administrador.", "error");
    return;
  }

  setButtonLoading(button, true, "Enviando…");

  try {
    const { data, error } = await sigecSupabase.functions.invoke(
      "invite-sigec-user",
      {
        body: {
          fullName,
          email,
          role,
          redirectTo: `${window.location.origin}${window.location.pathname}`
        }
      }
    );

    if (error) throw error;
    if (!data?.success) {
      throw new Error(data?.error || "No fue posible enviar la invitación.");
    }

    closeInviteModal();
    renderUsers(await fetchUsers());
    showToast("Invitación enviada correctamente.", "success");
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    setButtonLoading(button, false);
  }
});

$("user-search")?.addEventListener("input", () => renderUsers());
$("user-role-filter")?.addEventListener("change", () => renderUsers());


/* ------------------------------------------------------------
 * 8. INICIALIZACIÓN
 * ---------------------------------------------------------- */

/**
 * Al cargar la página:
 * - construye catálogos visuales;
 * - coloca la fecha;
 * - consulta si Supabase conserva una sesión válida;
 * - abre el sistema o deja visible el login.
 */
async function initializeApp() {
  buildCircuitOptions();
  setCurrentDate();
  setConnectionStatus("Conectando…", false);

  try {
    const {
      data: { session },
      error
    } = await sigecSupabase.auth.getSession();

    if (error) throw error;

    setConnectionStatus("Supabase conectado", true);

    if (session) {
      await openSystem(session);
    }
  } catch (error) {
    setConnectionStatus("Sin conexión", false);
    showToast(readableError(error), "error");
  }
}

initializeApp();
