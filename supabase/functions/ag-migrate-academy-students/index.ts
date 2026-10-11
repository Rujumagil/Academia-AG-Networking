import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const AG_WORKSPACE_ID = "fa4411f8-65c6-4762-8302-50789998e5b7";
const SOURCE_PROJECT_REF = "wtxlvmpolxacxnibaexj";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function emailKey(v: unknown) {
  return clean(v).toLowerCase();
}

function makePassword() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "AG-";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido." });

  const actorId = ctx.userClaims?.sub;
  if (!actorId) return reply(401, { error: "Sesión inválida." });

  const admin = ctx.supabaseAdmin;

  const [{ data: platformProfile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("platform_role,status").eq("id", actorId).maybeSingle(),
    admin.from("workspace_members").select("role,status")
      .eq("workspace_id", AG_WORKSPACE_ID).eq("user_id", actorId).maybeSingle(),
  ]);

  const allowed =
    (platformProfile?.platform_role === "super_admin" && platformProfile?.status === "active") ||
    (membership?.status === "active" && ["owner", "admin"].includes(String(membership?.role ?? "")));

  if (!allowed) return reply(403, { error: "No tienes permisos para migrar alumnos." });

  let body: any;
  try { body = await req.json(); } catch { return reply(400, { error: "Solicitud inválida." }); }

  const incoming = Array.isArray(body?.students) ? body.students : [];
  if (!incoming.length) return reply(400, { error: "No se recibieron alumnos." });
  if (incoming.length > 500) return reply(400, { error: "Máximo 500 alumnos." });

  const unique = new Map<string, any>();
  for (const s of incoming) {
    const email = emailKey(s?.email);
    const sourceId = clean(s?.source_user_id);
    if (!email || !sourceId || unique.has(email)) continue;
    unique.set(email, { ...s, email, source_user_id: sourceId });
  }

  const emails = Array.from(unique.keys());
  const { data: existingProfiles, error: existingError } = await admin
    .from("academy_profiles")
    .select("id,email")
    .in("email", emails);

  if (existingError) {
    console.error("AG_MIGRATION_PROFILE_LOOKUP_FAILED", existingError);
    return reply(500, { error: "No se pudieron consultar los alumnos destino.", detail: existingError.message });
  }

  const existingByEmail = new Map(
    (existingProfiles ?? []).map((p: any) => [emailKey(p.email), p])
  );

  const sourceIds = Array.from(unique.values()).map((s: any) => s.source_user_id);
  const { data: maps, error: mapError } = await admin
    .from("ag_academy_student_migration_map")
    .select("source_user_id,target_user_id")
    .eq("source_project_ref", SOURCE_PROJECT_REF)
    .in("source_user_id", sourceIds);

  if (mapError) return reply(500, { error: "No se pudo leer el mapa de migración.", detail: mapError.message });

  const mapBySource = new Map((maps ?? []).map((m: any) => [m.source_user_id, m]));
  const results: any[] = [];

  for (const student of unique.values()) {
    const fullName = clean(student.full_name) || student.email.split("@")[0];
    const sourceStatus = clean(student.account_status) || "active";
    const enrollments = Array.isArray(student.enrollments) ? student.enrollments : [];

    try {
      let targetId = mapBySource.get(student.source_user_id)?.target_user_id ?? "";
      let created = false;
      let password = "";
      let phone = clean(student.phone);

      if (!targetId) {
        const existing = existingByEmail.get(student.email);
        if (existing?.id) {
          targetId = existing.id;
        } else {
          if (!phone) {
            const { data: candidate } = await admin.from("ag_crm_candidates")
              .select("phone").eq("email", student.email).not("phone", "is", null)
              .order("updated_at", { ascending: false }).limit(1).maybeSingle();
            phone = clean(candidate?.phone);
          }

          password = makePassword();
          const { data: createdData, error: createError } = await admin.auth.admin.createUser({
            email: student.email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, phone, source: "ag_academy_migration" },
          });

          if (createError) throw createError;
          targetId = createdData?.user?.id ?? "";
          if (!targetId) throw new Error("No se recibió el ID del usuario.");
          created = true;
        }
      }

      if (!phone) {
        const { data: candidate } = await admin.from("ag_crm_candidates")
          .select("phone").eq("email", student.email).not("phone", "is", null)
          .order("updated_at", { ascending: false }).limit(1).maybeSingle();
        phone = clean(candidate?.phone);
      }

      const status = sourceStatus === "active" ? "active" : "suspended";

      const { error: profileError } = await admin.from("profiles").upsert({
        id: targetId,
        full_name: fullName,
        display_name: fullName,
        phone: phone || null,
        platform_role: "user",
        status,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const { error: academyError } = await admin.from("academy_profiles").upsert({
        id: targetId,
        email: student.email,
        full_name: fullName,
        phone: phone || null,
        role: "student",
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (academyError) throw academyError;

      const { error: saveMapError } = await admin.from("ag_academy_student_migration_map").upsert({
        source_project_ref: SOURCE_PROJECT_REF,
        source_user_id: student.source_user_id,
        target_user_id: targetId,
        source_email: student.email,
        source_account_status: sourceStatus,
        source_created_at: student.created_at || null,
        source_enrollments: enrollments,
        migration_status: mapBySource.has(student.source_user_id) ? "existing" : "migrated",
        metadata: {
          full_name: fullName,
          phone: phone || null,
          migrated_by: actorId,
          no_progress_expected: true,
        },
        migrated_at: new Date().toISOString(),
      }, { onConflict: "source_project_ref,source_user_id" });
      if (saveMapError) throw saveMapError;

      results.push({
        source_user_id: student.source_user_id,
        target_user_id: targetId,
        email: student.email,
        full_name: fullName,
        phone,
        status: created ? "created" : "existing_user",
        temporary_password: created ? password : "",
        enrollments_saved: enrollments.length,
      });
    } catch (e) {
      results.push({
        source_user_id: student.source_user_id,
        email: student.email,
        full_name: fullName,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const summary = {
    received: incoming.length,
    processed: results.length,
    created: results.filter((x) => x.status === "created").length,
    existing: results.filter((x) => x.status === "existing_user").length,
    errors: results.filter((x) => x.status === "error").length,
  };

  return reply(200, { ok: true, summary, results });
});

Deno.serve(handler);
