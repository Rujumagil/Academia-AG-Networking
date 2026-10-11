import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
function getAdminKey() {
  try {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.default) return String(parsed.default);
    }
  } catch (_) {}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
const SERVICE_ROLE_KEY = getAdminKey();
const AG_WORKSPACE_ID = "fa4411f8-65c6-4762-8302-50789998e5b7";
const SOURCE_PROJECT_REF = "wtxlvmpolxacxnibaexj";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value ?? "").trim();
}

function randomPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let out = "AG!";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Método no permitido." });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(500, { error: "Configuración incompleta." });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Autenticación requerida." });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const actor = userData?.user;
  if (userError || !actor) return json(401, { error: "Sesión inválida." });

  const [{ data: platformProfile }, { data: member }] = await Promise.all([
    admin.from("profiles").select("platform_role,status").eq("id", actor.id).maybeSingle(),
    admin.from("workspace_members")
      .select("role,status")
      .eq("workspace_id", AG_WORKSPACE_ID)
      .eq("user_id", actor.id)
      .maybeSingle(),
  ]);

  const allowed =
    (platformProfile?.platform_role === "super_admin" && platformProfile?.status === "active") ||
    (member?.status === "active" && ["owner", "admin"].includes(String(member?.role ?? "")));

  if (!allowed) return json(403, { error: "No tienes permisos para migrar alumnos de AG." });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Solicitud inválida." }); }

  const rawStudents = Array.isArray(body?.students) ? body.students : [];
  if (!rawStudents.length) return json(400, { error: "No se recibieron alumnos." });
  if (rawStudents.length > 500) return json(400, { error: "Máximo 500 alumnos por migración." });

  const deduped = new Map<string, any>();
  for (const s of rawStudents) {
    const email = normalizeEmail(s?.email);
    const sourceUserId = String(s?.source_user_id ?? "").trim();
    if (!email || !sourceUserId || deduped.has(email)) continue;
    deduped.set(email, { ...s, email, source_user_id: sourceUserId });
  }

  const targetEmails = Array.from(deduped.keys());
  const { data: existingAcademyProfiles, error: academyProfileLookupError } = await admin
    .from("academy_profiles")
    .select("id,email")
    .in("email", targetEmails);

  if (academyProfileLookupError) {
    console.error("AG_MIGRATION_ACADEMY_PROFILE_LOOKUP_FAILED", academyProfileLookupError);
    return json(500, {
      error: "No se pudieron consultar los alumnos destino.",
      detail: academyProfileLookupError.message || "Error al consultar perfiles académicos."
    });
  }

  const usersByEmail = new Map(
    (existingAcademyProfiles ?? []).map((u: any) => [normalizeEmail(u.email), u])
  );

  const sourceIds = Array.from(deduped.values()).map((s: any) => s.source_user_id);
  const { data: mappings, error: mappingsError } = await admin
    .from("ag_academy_student_migration_map")
    .select("source_user_id,target_user_id,source_email,migration_status")
    .eq("source_project_ref", SOURCE_PROJECT_REF)
    .in("source_user_id", sourceIds);

  if (mappingsError) return json(500, { error: mappingsError.message });
  const mappingBySource = new Map((mappings ?? []).map((m: any) => [m.source_user_id, m]));

  const results: any[] = [];

  for (const student of deduped.values()) {
    const email = student.email;
    const fullName = String(student.full_name ?? "").trim() || email.split("@")[0];
    let phone = normalizePhone(student.phone);
    const sourceStatus = String(student.account_status ?? "active");
    const sourceEnrollments = Array.isArray(student.enrollments) ? student.enrollments : [];

    try {
      const existingMap = mappingBySource.get(student.source_user_id);
      let targetUserId = existingMap?.target_user_id ?? "";
      let created = false;
      let temporaryPassword = "";

      if (!targetUserId) {
        const known = usersByEmail.get(email);
        if (known?.id) {
          targetUserId = known.id;
        } else {
          if (!phone) {
            const { data: candidate } = await admin
              .from("ag_crm_candidates")
              .select("phone")
              .eq("email", email)
              .not("phone", "is", null)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            phone = normalizePhone(candidate?.phone);
          }

          temporaryPassword = randomPassword();
          const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              phone,
              source: "ag_academy_migration",
            },
          });
          if (createError) throw createError;
          targetUserId = createdUser?.user?.id ?? "";
          if (!targetUserId) throw new Error("No se recibió ID del usuario creado.");
          created = true;
          usersByEmail.set(email, { id: targetUserId, email });
        }
      }

      if (!phone) {
        const { data: candidate } = await admin
          .from("ag_crm_candidates")
          .select("phone")
          .eq("email", email)
          .not("phone", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        phone = normalizePhone(candidate?.phone);
      }

      const targetStatus = sourceStatus === "active" ? "active" : "suspended";

      const { error: profileError } = await admin.from("profiles").upsert({
        id: targetUserId,
        full_name: fullName,
        display_name: fullName,
        phone: phone || null,
        platform_role: "user",
        status: targetStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const academyProfilePayload: any = {
        id: targetUserId,
        email,
        full_name: fullName,
        role: "student",
        updated_at: new Date().toISOString(),
      };
      if (phone) academyProfilePayload.phone = phone;

      const { error: academyProfileError } = await admin
        .from("academy_profiles")
        .upsert(academyProfilePayload, { onConflict: "id" });
      if (academyProfileError) throw academyProfileError;

      const { error: mapError } = await admin.from("ag_academy_student_migration_map").upsert({
        source_project_ref: SOURCE_PROJECT_REF,
        source_user_id: student.source_user_id,
        target_user_id: targetUserId,
        source_email: email,
        source_account_status: sourceStatus,
        source_created_at: student.created_at || null,
        source_enrollments: sourceEnrollments,
        migration_status: existingMap ? "existing" : "migrated",
        metadata: {
          full_name: fullName,
          phone: phone || null,
          migrated_by: actor.id,
          no_progress_expected: true,
        },
        migrated_at: new Date().toISOString(),
      }, { onConflict: "source_project_ref,source_user_id" });
      if (mapError) throw mapError;

      results.push({
        source_user_id: student.source_user_id,
        target_user_id: targetUserId,
        email,
        full_name: fullName,
        phone,
        status: created ? "created" : (existingMap ? "already_migrated" : "existing_user"),
        temporary_password: created ? temporaryPassword : "",
        enrollments_saved: sourceEnrollments.length,
      });
    } catch (error) {
      results.push({
        source_user_id: student.source_user_id,
        email,
        full_name: fullName,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = {
    received: rawStudents.length,
    processed: results.length,
    created: results.filter((x) => x.status === "created").length,
    existing: results.filter((x) => x.status === "existing_user").length,
    already_migrated: results.filter((x) => x.status === "already_migrated").length,
    errors: results.filter((x) => x.status === "error").length,
  };

  return json(200, { ok: true, summary, results });
});
