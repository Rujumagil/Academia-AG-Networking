import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.76.1";

/**
 * Correo institucional de Academia AG. Auth sigue en el Supabase compartido,
 * pero los enlaces y los correos de AG se generan fuera del emisor global.
 * No registrar emails, contraseñas ni tokens en logs.
 */
const allowedOrigins = new Set([
  "https://agbusinessnetworking.com",
  "https://www.agbusinessnetworking.com",
  "https://rujumagil.github.io",
]);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("AG_RESEND_API_KEY") ?? "";
const FROM = "Academia AG Business Networking <soporte@agbusinessnetworking.com>";
const REDIRECT_URL = "https://agbusinessnetworking.com/academia.html";
const WORKSPACE_ID = "fa4411f8-65c6-4762-8302-50789998e5b7";

function headers(origin: string): HeadersInit {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin : "https://agbusinessnetworking.com",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  };
}
function respond(origin: string, status: number, message: string) {
  return new Response(JSON.stringify({ message }), { status, headers: headers(origin) });
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c)
);
async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function emailHtml(name: string, action: "signup" | "recovery", link: string) {
  const recovery = action === "recovery";
  const title = recovery ? "Recupera tu acceso a Academia AG" : "¡Bienvenido a Academia AG!";
  const message = recovery
    ? "Recibimos una solicitud para restablecer tu contraseña de Academia AG."
    : "Gracias por registrarte. Confirma tu dirección de correo electrónico para activar tu cuenta.";
  const label = recovery ? "Restablecer mi contraseña" : "Confirmar mi correo";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:32px 12px;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#203047">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden">
  <tr><td style="background:#15263d;padding:28px;text-align:center">
  <img src="https://agbusinessnetworking.com/logo-completo-oficial.png" alt="AG Business Networking" width="220" style="display:block;margin:auto;max-width:100%;height:auto;color:white"></td></tr>
  <tr><td style="padding:32px 30px"><p style="color:#39785f;font-size:12px;font-weight:bold;letter-spacing:1.8px">ACADEMIA AG BUSINESS NETWORKING</p>
  <h1 style="font-size:27px;line-height:1.3;color:#203047">${title}</h1>
  <p>Hola, ${escapeHtml(name || "estudiante")}:</p>
  <p style="font-size:16px;line-height:1.6">${message}</p>
  <p style="margin:28px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#203047;color:#fff;text-decoration:none;padding:15px 24px;border-radius:8px;font-weight:bold">${label}</a></p>
  <p style="font-size:14px;line-height:1.6">Si no solicitaste este mensaje, puedes ignorarlo. Nunca compartas tu enlace con otras personas.</p>
  </td></tr><tr><td style="padding:20px;background:#f8fafc;text-align:center;color:#64748b;font-size:13px">
  AG Business Networking · soporte@agbusinessnetworking.com</td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST" || !allowedOrigins.has(origin)) {
    return respond(origin, 403, "Solicitud no autorizada.");
  }
  if (!SUPABASE_URL || !SERVICE_ROLE || !RESEND_KEY) {
    return respond(origin, 503, "El correo institucional no está disponible. Intenta más tarde.");
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return respond(origin, 400, "Solicitud inválida."); }

  const action = body.action === "signup" ? "signup" : body.action === "recovery" ? "recovery" : null;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 90) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!action || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(origin, 400, "Comprueba los datos del formulario.");
  }
  if (action === "signup" && (name.length < 2 || password.length < 8 || password.length > 128 || body.legalAccepted !== true)) {
    return respond(origin, 400, "Verifica el nombre, la contraseña y la aceptación de las condiciones.");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const key = "ag:" + action + ":" + await sha256(email) + ":" + Math.floor(Date.now() / 300000);
  const limit = await supabase.from("ag_auth_email_rate_limits").insert({ rate_key: key });
  if (limit.error) {
    return respond(origin, 429, "Espera unos minutos antes de solicitar otro correo.");
  }
  const options = action === "signup"
    ? { redirectTo: REDIRECT_URL, data: {
        full_name: name,
        academy_workspace_id: WORKSPACE_ID,
        academy_source: "ag_business_networking",
        legal_version: "2026-10",
        legal_accepted_at: new Date().toISOString(),
        privacy_accepted: true,
        terms_accepted: true,
        refund_policy_accepted: true,
      } }
    : { redirectTo: REDIRECT_URL + "?recovery=1" };

  const { data, error } = action === "signup"
    ? await supabase.auth.admin.generateLink({ type: "signup", email, password, options })
    : await supabase.auth.admin.generateLink({ type: "recovery", email, options });

  // Evitar divulgación de existencia de cuentas.
  if (error || !data?.properties?.action_link) {
    return respond(origin, 200, "Si el correo reúne los requisitos, recibirás las instrucciones correspondientes.");
  }
  const safeName = action === "signup" ? name : (data.user?.user_metadata?.full_name || "");
  const html = emailHtml(typeof safeName === "string" ? safeName.slice(0, 90) : "", action, data.properties.action_link);
  let delivery: Response;
  try {
    delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: [email],
        subject: action === "signup" ? "Confirma tu cuenta — Academia AG" : "Recupera tu acceso — Academia AG",
        html,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return respond(origin, 502, "No pudimos enviar el correo institucional. Intenta de nuevo más tarde.");
  }
  if (!delivery.ok) {
    console.error("AG mail provider failed", delivery.status);
    return respond(origin, 502, "No pudimos enviar el correo institucional. Contacta al soporte de AG.");
  }
  return respond(origin, 200, action === "signup"
    ? "Revisa tu correo para activar tu cuenta de Academia AG."
    : "Si el correo está registrado, recibirás las instrucciones de recuperación.");
});
