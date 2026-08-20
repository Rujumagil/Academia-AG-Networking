import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

function stripHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function safeText(value: unknown, max = 6000) {
  return String(value ?? "").trim().slice(0, max);
}

function outputText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks: string[] = [];
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if ((part?.type === "output_text" || part?.type === "text") && typeof part?.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function educationInstructions(contextText: string) {
  return `Eres el Tutor Educativo oficial de Academia AG Business Networking para el Utah Driver Success Program™.

OBJETIVO
Ayudar al alumno a comprender, practicar y reforzar lo aprendido. Explica con claridad, ejemplos cotidianos y lenguaje accesible para adultos.

REGLAS ACADÉMICAS
- Prioriza SIEMPRE el contenido académico suministrado en CONTEXTO DEL CURSO.
- No inventes requisitos legales, edades, plazos, multas, cantidades, distancias ni reglas de tránsito.
- Si una respuesta específica no está respaldada por el contexto suministrado, dilo claramente y recomienda verificar el Utah Driver Handbook vigente o el material oficial del curso.
- No presentes tus respuestas como asesoría legal.
- Si hay una evaluación activa, NO reveles la letra correcta, la opción correcta ni contestes la pregunta por el alumno. Explica el concepto relacionado, da una pista conceptual y deja que el alumno decida.
- Incluso fuera de una evaluación, si el alumno copia una pregunta claramente evaluativa y pide "la respuesta", prioriza enseñanza: explica cómo razonar el concepto sin entregar una clave de respuestas.
- Puedes hacer mini repasos y preguntas de práctica NUEVAS que no sean copias del examen.
- Responde en español salvo que el alumno te pida otro idioma.
- Sé breve y pedagógico. Normalmente 2 a 5 párrafos cortos.

CONTEXTO DEL CURSO
${contextText || "No hay contenido específico de una lección disponible en esta pantalla."}`;
}

function supportInstructions(contextText: string) {
  return `Eres el agente oficial de Soporte Técnico de Academia AG Business Networking.

OBJETIVO
Resolver problemas de acceso y uso de la Academia de forma clara, segura y paso a paso.

REGLAS DE SOPORTE
- Ayuda con inicio de sesión, recuperación de acceso, navegación, reproducción de videos, cuestionarios, progreso, navegador y funcionamiento general de la plataforma.
- Nunca pidas contraseñas, códigos de verificación, claves privadas, tokens ni datos de pago completos.
- No afirmes que cambiaste, reparaste o modificaste algo si solo estás dando instrucciones.
- No inventes funciones de la plataforma. Basa tus pasos en el diagnóstico y contexto suministrados.
- Primero ofrece la solución más simple y segura. Evita listas largas si no hacen falta.
- Si el problema requiere revisar la cuenta, base de datos o una falla que el alumno no puede resolver, indícale que use "Crear ticket humano" dentro del mismo panel.
- Responde en español salvo que el alumno te pida otro idioma.
- Mantén un tono profesional, cálido y directo.

DIAGNÓSTICO DE LA PANTALLA
${contextText || "No hay diagnóstico adicional."}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Debes iniciar sesión." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna";
    if (!supabaseUrl || !anonKey) return json({ error: "Configuración de Supabase incompleta." }, 500);
    if (!openaiKey) return json({ error: "El servicio de IA todavía no está configurado." }, 503);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return json({ error: "Sesión inválida." }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,full_name,role,account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.account_status && profile.account_status !== "active") return json({ error: "Cuenta no activa." }, 403);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "support" ? "support" : "education";
    const message = safeText(body?.message, 1800);
    if (!message) return json({ error: "Escribe una pregunta." }, 400);

    const incomingContext = body?.context && typeof body.context === "object" ? body.context : {};
    let lessonContext = "";
    let moduleContext = "";
    let courseContext = "";

    const lessonId = safeText(incomingContext?.lesson_id, 80);
    if (lessonId) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("id,module_id,title,content_html,position,duration_minutes")
        .eq("id", lessonId)
        .maybeSingle();

      if (lesson) {
        lessonContext = [
          `Lección: ${lesson.title}`,
          `Posición: ${lesson.position}`,
          lesson.content_html ? `Contenido de la lección: ${stripHtml(lesson.content_html).slice(0, 7000)}` : "",
        ].filter(Boolean).join("\n");

        const { data: module } = await supabase
          .from("modules")
          .select("id,course_id,title,position")
          .eq("id", lesson.module_id)
          .maybeSingle();

        if (module) {
          moduleContext = `Módulo: ${module.title}\nPosición del módulo: ${module.position}`;
          const { data: course } = await supabase
            .from("courses")
            .select("id,title,slug,subtitle,description")
            .eq("id", module.course_id)
            .maybeSingle();
          if (course) {
            courseContext = [
              `Curso: ${course.title}`,
              course.subtitle ? `Subtítulo: ${course.subtitle}` : "",
              course.description ? `Descripción: ${course.description}` : "",
            ].filter(Boolean).join("\n");
          }
        }
      }
    }

    const diagnostics = [
      courseContext,
      moduleContext,
      lessonContext,
      `Evaluación activa: ${Boolean(incomingContext?.exam_active) ? "sí" : "no"}`,
      `Ruta: ${safeText(incomingContext?.route, 300)}`,
      mode === "support" ? `Pantalla: ${safeText(incomingContext?.viewport, 60)}` : "",
      mode === "support" ? `Navegador: ${safeText(incomingContext?.user_agent, 500)}` : "",
    ].filter(Boolean).join("\n");

    const history = Array.isArray(body?.history)
      ? body.history.slice(-8).map((item: any) => ({
          role: item?.role === "assistant" ? "assistant" : "user",
          text: safeText(item?.text, 1600),
        })).filter((item: any) => item.text)
      : [];

    const transcript = history.map((item: any) => `${item.role === "assistant" ? "Asistente" : "Alumno"}: ${item.text}`).join("\n\n");
    const input = [
      transcript ? `CONVERSACIÓN RECIENTE\n${transcript}` : "",
      `MENSAJE ACTUAL DEL ALUMNO\n${message}`,
    ].filter(Boolean).join("\n\n");

    const instructions = mode === "support"
      ? supportInstructions(diagnostics)
      : educationInstructions(diagnostics);

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        store: false,
        max_output_tokens: 700,
      }),
    });

    const aiPayload = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      console.error("OpenAI API error", aiResponse.status, aiPayload);
      return json({ error: "El asistente no pudo responder en este momento." }, 502);
    }

    const reply = outputText(aiPayload);
    if (!reply) return json({ error: "El asistente devolvió una respuesta vacía." }, 502);

    return json({
      reply,
      mode,
      model,
      context: {
        course: courseContext ? true : false,
        module: moduleContext ? true : false,
        lesson: lessonContext ? true : false,
        exam_active: Boolean(incomingContext?.exam_active),
      },
    });
  } catch (error) {
    console.error("academy-agent error", error);
    return json({ error: "No pudimos procesar tu solicitud." }, 500);
  }
});
