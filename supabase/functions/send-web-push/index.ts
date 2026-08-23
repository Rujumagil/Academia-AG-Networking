import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:proyectocompas.info@gmail.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function bearer(req: Request) {
  const value = req.headers.get("Authorization") || "";
  return value.replace(/^Bearer\s+/i, "").trim();
}

async function currentUser(req: Request) {
  const token = bearer(req);
  if (!token) throw new Error("Autenticación requerida");
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) throw new Error("Sesión inválida");
  return data.user;
}

async function roleFor(userId: string) {
  const { data } = await admin
    .from("profiles")
    .select("role,account_status,full_name,email")
    .eq("id", userId)
    .maybeSingle();
  return data || null;
}

async function ensureVapid() {
  const { data: existing, error: readError } = await admin
    .from("push_server_config")
    .select("vapid_public_key,vapid_private_key,vapid_subject")
    .eq("id", 1)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.vapid_public_key && existing?.vapid_private_key) return existing;

  const generated = webpush.generateVAPIDKeys();
  const row = {
    id: 1,
    vapid_public_key: generated.publicKey,
    vapid_private_key: generated.privateKey,
    vapid_subject: VAPID_SUBJECT,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await admin
    .from("push_server_config")
    .upsert(row, { onConflict: "id" })
    .select("vapid_public_key,vapid_private_key,vapid_subject")
    .single();
  if (error) throw error;
  return data;
}

async function claim(eventKey: string) {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("push_dispatch_log")
    .select("status,updated_at")
    .eq("event_key", eventKey)
    .maybeSingle();

  if (existing?.status === "done") return false;

  const { error } = await admin.from("push_dispatch_log").upsert({
    event_key: eventKey,
    status: "processing",
    recipient_count: 0,
    success_count: 0,
    failure_count: 0,
    last_error: null,
    updated_at: now
  }, { onConflict: "event_key" });
  if (error) throw error;
  return true;
}

async function finish(eventKey: string, stats: { recipients: number; success: number; failed: number; error?: string }) {
  await admin.from("push_dispatch_log").update({
    status: stats.failed > 0 && stats.success === 0 ? "failed" : "done",
    recipient_count: stats.recipients,
    success_count: stats.success,
    failure_count: stats.failed,
    last_error: stats.error || null,
    updated_at: new Date().toISOString()
  }).eq("event_key", eventKey);
}

async function subscriptionsFor(userIds?: string[]) {
  let query = admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,expiration_time")
    .eq("enabled", true);
  if (userIds?.length) query = query.in("user_id", userIds);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function dispatch(payload: Record<string, unknown>, userIds?: string[]) {
  const config = await ensureVapid();
  webpush.setVapidDetails(config.vapid_subject, config.vapid_public_key, config.vapid_private_key);

  const subscriptions = await subscriptionsFor(userIds);
  let success = 0;
  let failed = 0;
  let lastError = "";

  await Promise.all(subscriptions.map(async (row: any) => {
    try {
      await webpush.sendNotification({
        endpoint: row.endpoint,
        expirationTime: row.expiration_time || null,
        keys: { p256dh: row.p256dh, auth: row.auth }
      }, JSON.stringify(payload), { TTL: 3600 });
      success += 1;
      await admin.from("push_subscriptions").update({
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", row.id);
    } catch (error: any) {
      failed += 1;
      lastError = error?.message || String(error);
      const statusCode = Number(error?.statusCode || error?.status || 0);
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").update({
          enabled: false,
          updated_at: new Date().toISOString()
        }).eq("id", row.id);
      }
      console.error("WEB_PUSH_SEND_FAILED", statusCode, lastError);
    }
  }));

  return { recipients: subscriptions.length, success, failed, error: lastError || undefined };
}

function courseTitle(subject = "", message = "") {
  const cleaned = subject.replace(/^(Solicitud de acceso|Pre-registro)\s*·\s*/i, "").trim();
  if (cleaned && cleaned !== subject) return cleaned;
  return message.match(/(?:^|\n)Curso:\s*(.+)/i)?.[1]?.trim() || "un programa de Academia AG";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const user = await currentUser(req);
    const profile = await roleFor(user.id);
    if (!profile || profile.account_status !== "active") return json({ error: "Cuenta no autorizada" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "config");

    if (action === "config") {
      const config = await ensureVapid();
      return json({ ok: true, publicKey: config.vapid_public_key, subject: config.vapid_subject });
    }

    if (action === "self_test") {
      const payload = {
        title: "Prueba de notificaciones · Academia AG",
        body: "Las notificaciones push están activas correctamente en este dispositivo.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `ag-self-test-${user.id}`,
        url: "/academia.html#notifications",
        notificationId: null,
        type: "general"
      };
      const stats = await dispatch(payload, [user.id]);
      return json({ ok: true, ...stats });
    }

    if (action === "course_request") {
      const ticketId = String(body?.ticketId || "").trim();
      if (!ticketId) return json({ error: "ticketId requerido" }, 400);

      const { data: ticket, error } = await admin
        .from("support_tickets")
        .select("id,user_id,category,subject,message,status,created_at")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      if (!ticket || ticket.category !== "course") return json({ error: "Solicitud no encontrada" }, 404);
      if (ticket.user_id !== user.id && profile.role !== "admin") return json({ error: "No autorizado" }, 403);

      const eventKey = `course-request:${ticket.id}`;
      if (!await claim(eventKey)) return json({ ok: true, duplicate: true });

      const { data: admins, error: adminsError } = await admin
        .from("profiles")
        .select("id,full_name,email")
        .eq("role", "admin")
        .eq("account_status", "active");
      if (adminsError) throw adminsError;

      const student = await roleFor(ticket.user_id);
      const title = courseTitle(ticket.subject || "", ticket.message || "");
      const prereg = /^Pre-registro\s*·/i.test(ticket.subject || "");
      const notificationTitle = prereg ? "Nuevo pre-registro de curso" : "Nueva solicitud de acceso";
      const studentName = student?.full_name || student?.email || "Un alumno";
      const notificationBody = prereg
        ? `${studentName} se pre-registró para ${title}.`
        : `${studentName} solicitó acceso a ${title}.`;

      const rows = (admins || []).map((adminProfile: any) => ({
        target_user: adminProfile.id,
        notification_type: "support",
        title: notificationTitle,
        message: notificationBody,
        href: "#admin",
        created_by: ticket.user_id
      }));
      if (rows.length) {
        const { error: insertError } = await admin.from("notifications").insert(rows);
        if (insertError) throw insertError;
      }

      const payload = {
        title: notificationTitle,
        body: notificationBody,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `ag-course-request-${ticket.id}`,
        url: "/academia.html#admin",
        ticketId: ticket.id,
        type: "support"
      };
      const adminIds = (admins || []).map((item: any) => item.id);
      const stats = await dispatch(payload, adminIds);
      await finish(eventKey, stats);
      return json({ ok: true, ...stats });
    }

    if (action === "notification") {
      if (profile.role !== "admin") return json({ error: "Sólo administración puede despachar avisos" }, 403);
      const notificationId = String(body?.notificationId || "").trim();
      if (!notificationId) return json({ error: "notificationId requerido" }, 400);

      const { data: notification, error } = await admin
        .from("notifications")
        .select("id,target_user,notification_type,title,message,href,created_by,created_at")
        .eq("id", notificationId)
        .maybeSingle();
      if (error) throw error;
      if (!notification) return json({ error: "Notificación no encontrada" }, 404);

      const eventKey = `notification:${notification.id}`;
      if (!await claim(eventKey)) return json({ ok: true, duplicate: true });

      const payload = {
        title: notification.title,
        body: notification.message,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `ag-notification-${notification.id}`,
        url: `/academia.html${String(notification.href || "#notifications").startsWith("#") ? notification.href : "#notifications"}`,
        notificationId: notification.id,
        type: notification.notification_type || "general"
      };
      const recipients = notification.target_user ? [notification.target_user] : undefined;
      const stats = await dispatch(payload, recipients);
      await finish(eventKey, stats);
      return json({ ok: true, ...stats });
    }

    return json({ error: "Acción no reconocida" }, 400);
  } catch (error: any) {
    console.error("SEND_WEB_PUSH_FAILED", error);
    return json({ error: error?.message || "No fue posible procesar la notificación push" }, 500);
  }
});
