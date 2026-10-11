
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const AG_WORKSPACE_ID = "fa4411f8-65c6-4762-8302-50789998e5b7";
const SOURCE_PROJECT_REF = "wtxlvmpolxacxnibaexj";

function getAdminKey() {
  try {
    const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return String(parsed.default);
    }
  } catch (_) {}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function nullable(v: unknown) {
  const s = clean(v);
  return s ? s : null;
}

function jwtSubject(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return "";
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - payload.length % 4) % 4);
    const data = JSON.parse(atob(padded));
    return clean(data?.sub);
  } catch (_) {
    return "";
  }
}

function list(body: any, key: string) {
  return Array.isArray(body?.[key]) ? body[key] : [];
}

function status(v: unknown, allowed: string[], fallback: string) {
  const x = clean(v);
  return allowed.includes(x) ? x : fallback;
}

async function upsertChunks(admin: any, table: string, rows: any[], onConflict = "id") {
  if (!rows.length) return;
  const size = 150;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await admin.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(table + ": " + error.message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido." });

  const adminKey = getAdminKey();
  if (!SUPABASE_URL || !adminKey) {
    return reply(500, { error: "Configuración de servidor incompleta." });
  }

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const actorId = jwtSubject(token);
  if (!actorId) return reply(401, { error: "Sesión inválida." });

  const admin = createClient(SUPABASE_URL, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: platformProfile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("platform_role,status").eq("id", actorId).maybeSingle(),
    admin.from("workspace_members").select("role,status")
      .eq("workspace_id", AG_WORKSPACE_ID)
      .eq("user_id", actorId)
      .maybeSingle(),
  ]);

  const allowed =
    (platformProfile?.platform_role === "super_admin" && platformProfile?.status === "active") ||
    (membership?.status === "active" && ["owner", "admin"].includes(String(membership?.role ?? "")));

  if (!allowed) return reply(403, { error: "No tienes permisos para migrar cursos de AG." });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Solicitud inválida." });
  }

  const courses = list(body, "courses");
  const modules = list(body, "modules");
  const lessons = list(body, "lessons");
  const resources = list(body, "resources");
  const lessonBlocks = list(body, "lesson_blocks");
  const courseVersions = list(body, "course_versions");
  const assessments = list(body, "assessments");
  const assessmentQuestions = list(body, "assessment_questions");
  const assessmentOptions = list(body, "assessment_options");
  const lessonQuizzes = list(body, "lesson_quizzes");

  if (!courses.length) return reply(400, { error: "No se recibieron cursos." });
  if (courses.length > 50) return reply(400, { error: "Demasiados cursos en una sola migración." });

  const courseIds = new Set(courses.map((x: any) => clean(x.id)).filter(Boolean));
  const courseRows: any[] = [];

  for (const c of courses) {
    const id = clean(c.id);
    if (!id) continue;

    let slug = clean(c.slug) || ("ag-course-" + id.slice(0, 8));
    const { data: slugOwner } = await admin
      .from("academy_courses")
      .select("id,workspace_id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugOwner?.id && slugOwner.id !== id) {
      slug = "ag-" + slug;
      const { data: secondOwner } = await admin
        .from("academy_courses")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (secondOwner?.id && secondOwner.id !== id) {
        slug = slug + "-" + id.slice(0, 8);
      }
    }

    courseRows.push({
      id,
      workspace_id: AG_WORKSPACE_ID,
      title: clean(c.title) || "Curso AG",
      slug,
      subtitle: nullable(c.subtitle),
      description: nullable(c.description),
      cover_url: nullable(c.cover_url),
      cover_path: nullable(c.cover_path),
      category: nullable(c.category),
      status: status(c.status, ["draft","published","archived"], "draft"),
      featured: Boolean(c.featured),
      instructor_name: nullable(c.instructor_name),
      duration_label: nullable(c.duration_label),
      price: c.price == null || c.price === "" ? null : Number(c.price),
      sale_price: c.sale_price == null || c.sale_price === "" ? null : Number(c.sale_price),
      payment_url: nullable(c.payment_url),
      created_by: actorId,
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
    });
  }

  try {
    await upsertChunks(admin, "academy_courses", courseRows);

    const moduleRows = modules
      .filter((m: any) => courseIds.has(clean(m.course_id)))
      .map((m: any) => ({
        id: clean(m.id),
        course_id: clean(m.course_id),
        title: clean(m.title) || "Módulo",
        description: nullable(m.description),
        position: Number(m.position || 1),
        created_at: m.created_at || new Date().toISOString(),
        updated_at: m.updated_at || new Date().toISOString(),
      }))
      .filter((m: any) => m.id && m.course_id);

    await upsertChunks(admin, "academy_modules", moduleRows);

    const moduleIds = new Set(moduleRows.map((m: any) => m.id));

    const lessonRows = lessons
      .filter((l: any) => moduleIds.has(clean(l.module_id)))
      .map((l: any) => ({
        id: clean(l.id),
        module_id: clean(l.module_id),
        title: clean(l.title) || "Lección",
        description: nullable(l.description),
        lesson_type: status(
          l.lesson_type,
          ["video","text","audio","download","quiz","live","activity","resource"],
          "video"
        ),
        video_url: nullable(l.video_url),
        content_html: nullable(l.content_html),
        duration_minutes: Math.max(0, Number(l.duration_minutes || 0)),
        position: Number(l.position || 1),
        is_preview: Boolean(l.is_preview),
        transcript_text: nullable(l.transcript_text),
        captions_url: nullable(l.captions_url),
        accessibility_notes: nullable(l.accessibility_notes),
        stream_provider: nullable(l.stream_provider),
        stream_uid: nullable(l.stream_uid),
        stream_hls_url: nullable(l.stream_hls_url),
        stream_dash_url: nullable(l.stream_dash_url),
        stream_thumbnail_url: nullable(l.stream_thumbnail_url),
        stream_duration_seconds: l.stream_duration_seconds == null ? null : Math.max(0, Math.round(Number(l.stream_duration_seconds))),
        lesson_code: nullable(l.lesson_code),
        lesson_kind: status(l.lesson_kind, ["lesson","promo","welcome","closing"], "lesson"),
        created_at: l.created_at || new Date().toISOString(),
        updated_at: l.updated_at || new Date().toISOString(),
      }))
      .filter((l: any) => l.id && l.module_id);

    await upsertChunks(admin, "academy_lessons", lessonRows);
    const lessonIds = new Set(lessonRows.map((l: any) => l.id));

    const resourceRows = resources
      .filter((r: any) => !r.course_id || courseIds.has(clean(r.course_id)))
      .map((r: any) => ({
        id: clean(r.id),
        workspace_id: AG_WORKSPACE_ID,
        course_id: nullable(r.course_id),
        title: clean(r.title) || "Recurso",
        description: nullable(r.description),
        resource_type: status(r.resource_type, ["book","pdf","audio","video","template","link","image"], "pdf"),
        file_path: nullable(r.file_path),
        external_url: nullable(r.external_url),
        is_public: Boolean(r.is_public),
        thumbnail_path: nullable(r.thumbnail_path),
        thumbnail_url: nullable(r.thumbnail_url),
        created_by: actorId,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
      }))
      .filter((r: any) => r.id && (!r.course_id || courseIds.has(r.course_id)));

    await upsertChunks(admin, "academy_resources", resourceRows);

    const blockRows = lessonBlocks
      .filter((b: any) => lessonIds.has(clean(b.lesson_id)))
      .map((b: any) => ({
        id: clean(b.id),
        lesson_id: clean(b.lesson_id),
        block_type: status(b.block_type, ["text","video","image","pdf","audio","activity","divider"], "text"),
        position: Number(b.position || 1),
        content: b.content && typeof b.content === "object" ? b.content : {},
        created_by: actorId,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }))
      .filter((b: any) => b.id && b.lesson_id);

    await upsertChunks(admin, "academy_lesson_blocks", blockRows);

    const versionRows = courseVersions
      .filter((v: any) => courseIds.has(clean(v.course_id)))
      .map((v: any) => ({
        id: clean(v.id),
        course_id: clean(v.course_id),
        version_number: Number(v.version_number || 1),
        label: nullable(v.label),
        snapshot: v.snapshot && typeof v.snapshot === "object" ? v.snapshot : {},
        created_by: actorId,
        created_at: v.created_at || new Date().toISOString(),
      }))
      .filter((v: any) => v.id && v.course_id);

    await upsertChunks(admin, "academy_course_versions", versionRows);

    const assessmentRows = assessments
      .filter((a: any) => courseIds.has(clean(a.course_id)))
      .map((a: any) => ({
        id: clean(a.id),
        course_id: clean(a.course_id),
        module_id: moduleIds.has(clean(a.module_id)) ? clean(a.module_id) : null,
        title: clean(a.title) || "Evaluación",
        description: nullable(a.description),
        assessment_type: status(a.assessment_type, ["quiz","module_exam","final_exam"], "quiz"),
        passing_score: Number(a.passing_score ?? a.pass_score ?? 70),
        max_attempts: a.max_attempts == null ? null : Number(a.max_attempts),
        time_limit_minutes: a.time_limit_minutes == null ? null : Number(a.time_limit_minutes),
        status: status(a.status, ["draft","published","archived"], "draft"),
        position: Number(a.position || 1),
        created_by: actorId,
        created_at: a.created_at || new Date().toISOString(),
        updated_at: a.updated_at || new Date().toISOString(),
      }))
      .filter((a: any) => a.id && a.course_id);

    await upsertChunks(admin, "academy_assessments", assessmentRows);
    const assessmentIds = new Set(assessmentRows.map((a: any) => a.id));

    const questionRows = assessmentQuestions
      .filter((q: any) => assessmentIds.has(clean(q.assessment_id)))
      .map((q: any) => ({
        id: clean(q.id),
        assessment_id: clean(q.assessment_id),
        prompt: clean(q.prompt ?? q.question_text) || "Pregunta",
        question_type: status(q.question_type, ["single_choice","multiple_choice","true_false","short_text"], "single_choice"),
        explanation: nullable(q.explanation),
        points: Number(q.points || 1),
        position: Number(q.position || 1),
        created_at: q.created_at || new Date().toISOString(),
      }))
      .filter((q: any) => q.id && q.assessment_id);

    await upsertChunks(admin, "academy_assessment_questions", questionRows);
    const questionIds = new Set(questionRows.map((q: any) => q.id));

    const optionRows = assessmentOptions
      .filter((o: any) => questionIds.has(clean(o.question_id)))
      .map((o: any) => ({
        id: clean(o.id),
        question_id: clean(o.question_id),
        label: clean(o.label ?? o.option_text) || "Opción",
        is_correct: Boolean(o.is_correct),
        position: Number(o.position || 1),
        created_at: o.created_at || new Date().toISOString(),
      }))
      .filter((o: any) => o.id && o.question_id);

    await upsertChunks(admin, "academy_assessment_options", optionRows);

    const quizRows = lessonQuizzes
      .filter((q: any) => lessonIds.has(clean(q.lesson_id)))
      .map((q: any) => ({
        id: clean(q.id) || crypto.randomUUID(),
        lesson_id: clean(q.lesson_id),
        question: clean(q.question) || "Pregunta",
        options: q.options && typeof q.options === "object" ? q.options : [],
        correct_key: nullable(q.correct_key),
        explanation: nullable(q.explanation),
        required: Boolean(q.required),
        created_at: q.created_at || new Date().toISOString(),
        updated_at: q.updated_at || new Date().toISOString(),
      }))
      .filter((q: any) => q.lesson_id);

    await upsertChunks(admin, "academy_lesson_quizzes", quizRows, "lesson_id");

    for (const course of courseRows) {
      const cid = course.id;
      const stats = {
        modules: moduleRows.filter((m: any) => m.course_id === cid).length,
        lessons: lessonRows.filter((l: any) => {
          const module = moduleRows.find((m: any) => m.id === l.module_id);
          return module?.course_id === cid;
        }).length,
        resources: resourceRows.filter((r: any) => r.course_id === cid).length,
        assessments: assessmentRows.filter((a: any) => a.course_id === cid).length,
      };

      const { error: mapSaveError } = await admin.from("ag_academy_course_migration_map").upsert({
        source_project_ref: SOURCE_PROJECT_REF,
        source_course_id: cid,
        target_course_id: cid,
        source_slug: course.slug,
        source_title: course.title,
        source_stats: stats,
        migration_status: "migrated",
        migrated_at: new Date().toISOString(),
      }, { onConflict: "source_project_ref,source_course_id" });

      if (mapSaveError) throw new Error("course migration map: " + mapSaveError.message);
    }

    const { data: studentMaps, error: studentMapError } = await admin
      .from("ag_academy_student_migration_map")
      .select("target_user_id,source_enrollments")
      .eq("source_project_ref", SOURCE_PROJECT_REF);

    if (studentMapError) throw new Error("student migration map: " + studentMapError.message);

    const enrollmentRows: any[] = [];
    for (const sm of studentMaps ?? []) {
      const saved = Array.isArray(sm.source_enrollments) ? sm.source_enrollments : [];
      for (const e of saved) {
        const courseId = clean(e?.course_id);
        if (!courseIds.has(courseId)) continue;
        enrollmentRows.push({
          user_id: sm.target_user_id,
          course_id: courseId,
          status: status(e?.status, ["active","completed","cancelled","expired"], "active"),
          enrolled_at: e?.enrolled_at || new Date().toISOString(),
          completed_at: e?.completed_at || null,
          expires_at: e?.expires_at || null,
        });
      }
    }

    await upsertChunks(admin, "academy_enrollments", enrollmentRows, "user_id,course_id");

    const summary = {
      courses: courseRows.length,
      modules: moduleRows.length,
      lessons: lessonRows.length,
      resources: resourceRows.length,
      lesson_blocks: blockRows.length,
      course_versions: versionRows.length,
      assessments: assessmentRows.length,
      questions: questionRows.length,
      options: optionRows.length,
      lesson_quizzes: quizRows.length,
      enrollments: enrollmentRows.length,
    };

    return reply(200, { ok: true, summary });
  } catch (error) {
    console.error("AG_ACADEMY_COURSE_MIGRATION_FAILED", error);
    return reply(500, {
      error: "No se completó la migración de cursos.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});
