import { createClient } from 'npm:@supabase/supabase-js@2'

type StudentInput = {
  first_name?: string
  last_name?: string
  full_name?: string
  email: string
  phone?: string
}

type ImportBody = {
  students: StudentInput[]
  course_id?: string
  source?: string
}

const DEFAULT_COURSE_ID = '11111111-1111-4111-8111-111111111111'
const ALLOWED_ORIGIN = 'https://rujumagil.github.io'

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  }
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) })
}

function getDefaultKey(raw: string | undefined) {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.default === 'string') return parsed.default
    const first = Object.values(parsed || {}).find((value) => typeof value === 'string')
    return typeof first === 'string' ? first : ''
  } catch {
    return raw
  }
}

function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase()
}

function normalizeName(student: StudentInput) {
  const explicit = String(student.full_name || '').trim()
  if (explicit) return explicit
  return [student.first_name, student.last_name]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function randomPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let value = 'Ag!'
  for (const byte of bytes) value += alphabet[byte % alphabet.length]
  return value
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureProduct(adminClient: any, actingAdminId: string, courseId: string) {
  const { data: course, error: courseError } = await adminClient
    .from('courses')
    .select('id,title,slug,workspace_id,status')
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) throw courseError
  if (!course) throw new Error('No se encontró el curso solicitado.')
  if (!course.workspace_id) throw new Error('El curso no tiene workspace_id asignado.')

  const { data: mappingRows, error: mappingError } = await adminClient
    .from('product_contents')
    .select('product_id')
    .eq('content_type', 'course')
    .eq('course_id', courseId)
    .limit(1)

  if (mappingError) throw mappingError
  if (mappingRows?.[0]?.product_id) return { productId: mappingRows[0].product_id, course }

  const externalReference = `ag-course-${courseId}`
  const preferredSlug = `${course.slug || 'curso'}-access`
  let product: any = null

  const { data: byReference, error: byReferenceError } = await adminClient
    .from('products')
    .select('*')
    .eq('external_reference', externalReference)
    .maybeSingle()
  if (byReferenceError) throw byReferenceError
  product = byReference

  if (!product) {
    const { data: bySlug, error: bySlugError } = await adminClient
      .from('products')
      .select('*')
      .eq('slug', preferredSlug)
      .maybeSingle()
    if (bySlugError) throw bySlugError
    product = bySlug
  }

  if (!product) {
    const { data: created, error: createError } = await adminClient
      .from('products')
      .insert({
        workspace_id: course.workspace_id,
        name: course.title,
        slug: preferredSlug,
        product_type: 'course',
        description: `Acceso académico a ${course.title}`,
        price: 0,
        currency: 'USD',
        status: 'active',
        external_reference: externalReference,
        created_by: actingAdminId,
      })
      .select('*')
      .single()
    if (createError) throw createError
    product = created
  }

  const { error: mappingInsertError } = await adminClient
    .from('product_contents')
    .insert({
      product_id: product.id,
      content_type: 'course',
      course_id: courseId,
    })
  if (mappingInsertError) throw mappingInsertError

  return { productId: product.id, course }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, 405, { error: 'Método no permitido' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const publishableKey = getDefaultKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) || Deno.env.get('SUPABASE_ANON_KEY') || ''
    const secretKey = getDefaultKey(Deno.env.get('SUPABASE_SECRET_KEYS')) || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !publishableKey || !secretKey) {
      return json(req, 500, { error: 'La función no tiene las claves internas necesarias.' })
    }

    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) return json(req, 401, { error: 'Sesión requerida.' })

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) return json(req, 401, { error: 'Sesión inválida o vencida.' })

    const actingAdmin = userData.user
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id,role,account_status,email')
      .eq('id', actingAdmin.id)
      .maybeSingle()

    if (profileError) return json(req, 403, { error: profileError.message })
    if (!profile || profile.role !== 'admin' || profile.account_status !== 'active') {
      return json(req, 403, { error: 'Solo un administrador activo puede importar alumnos.' })
    }

    const body = (await req.json()) as ImportBody
    if (!Array.isArray(body?.students) || !body.students.length) {
      return json(req, 400, { error: 'No se recibieron alumnos.' })
    }
    if (body.students.length > 200) {
      return json(req, 400, { error: 'Máximo 200 alumnos por importación.' })
    }

    const courseId = String(body.course_id || DEFAULT_COURSE_ID)
    const source = String(body.source || 'bulk_import').slice(0, 80)
    const { productId, course } = await ensureProduct(adminClient, actingAdmin.id, courseId)
    const batchId = crypto.randomUUID()

    const deduped = new Map<string, StudentInput>()
    for (const student of body.students) {
      const email = normalizeEmail(student?.email)
      if (!email || deduped.has(email)) continue
      deduped.set(email, student)
    }

    const results: any[] = []

    for (const [email, student] of deduped.entries()) {
      const fullName = normalizeName(student) || email.split('@')[0]
      const phone = String(student.phone || '').trim()

      if (!isValidEmail(email)) {
        results.push({ email, full_name: fullName, status: 'invalid_email', message: 'Formato de correo inválido.' })
        continue
      }

      try {
        let userId = ''
        let temporaryPassword = ''
        let created = false

        const { data: existingProfile, error: existingProfileError } = await adminClient
          .from('profiles')
          .select('id,email,role,account_status,full_name')
          .eq('email', email)
          .maybeSingle()
        if (existingProfileError) throw existingProfileError

        if (existingProfile?.id) {
          if (existingProfile.role !== 'student') {
            results.push({
              email,
              full_name: fullName,
              status: 'skipped_non_student',
              message: `La cuenta ya existe con rol ${existingProfile.role}.`,
            })
            continue
          }
          userId = existingProfile.id
          const { error: reactivateError } = await adminClient
            .from('profiles')
            .update({ full_name: fullName, account_status: 'active' })
            .eq('id', userId)
          if (reactivateError) throw reactivateError
        } else {
          temporaryPassword = randomPassword()
          const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, phone },
          })
          if (createUserError) throw createUserError
          userId = createdUser?.user?.id || ''
          if (!userId) throw new Error('Supabase no devolvió el ID del usuario creado.')
          created = true

          const { error: profileUpdateError } = await adminClient
            .from('profiles')
            .update({
              full_name: fullName,
              role: 'student',
              account_status: 'active',
              must_change_password: true,
              password_changed_at: null,
            })
            .eq('id', userId)
          if (profileUpdateError) throw profileUpdateError
        }

        const { data: accessId, error: accessError } = await userClient.rpc('admin_grant_product_access', {
          target_user: userId,
          target_product: productId,
          access_source: source,
          access_reference: `bulk:${batchId}`,
          access_expires_at: null,
        })
        if (accessError) throw accessError

        results.push({
          email,
          full_name: fullName,
          phone,
          user_id: userId,
          access_id: accessId,
          status: created ? 'created' : 'existing_access_granted',
          temporary_password: created ? temporaryPassword : '',
          must_change_password: created,
          message: created
            ? 'Usuario creado, correo confirmado y acceso activo. Debe cambiar su contraseña al primer ingreso.'
            : 'La cuenta ya existía; se reactivó y se concedió acceso al curso.',
        })
      } catch (error) {
        results.push({
          email,
          full_name: fullName,
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }

      await sleep(40)
    }

    const summary = results.reduce(
      (acc, item) => {
        acc.total += 1
        if (item.status === 'created') acc.created += 1
        else if (item.status === 'existing_access_granted') acc.existing += 1
        else if (item.status === 'error') acc.errors += 1
        else acc.skipped += 1
        return acc
      },
      { total: 0, created: 0, existing: 0, skipped: 0, errors: 0 },
    )

    return json(req, 200, {
      ok: summary.errors === 0,
      batch_id: batchId,
      course: { id: course.id, title: course.title },
      product_id: productId,
      summary,
      results,
      credentials_notice: 'Las contraseñas temporales solo se devuelven en esta respuesta. No se guardan en tablas de Academia AG.',
    })
  } catch (error) {
    console.error('[bulk-import-students]', error)
    return json(req, 500, { error: error instanceof Error ? error.message : String(error) })
  }
})
