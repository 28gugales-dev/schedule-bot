// purge-student — full account closure (FERPA destruction beyond the data layer).
//
// deleteStudentData() in the app removes a student's profile (cascading their
// requests) and uploaded documents. That destroys the education records, but the
// auth.users identity shell remains. This edge function removes that shell too,
// which ALSO cascades profile + requests via FK — use it for complete account
// closure on termination.
//
// Runs with the SERVICE ROLE, so it is gated: the CALLER must be an authenticated
// counselor (profiles.role = 'admin'). Never expose the service-role key to the
// browser; only this function holds it.
//
// Deploy:  supabase functions deploy purge-student
// Invoke:  POST { "studentId": "<uuid>" }  with the counselor's Authorization header
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DOC_BUCKET = 'documents'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 })
  }

  const { studentId } = await req.json().catch(() => ({}))
  if (!studentId) {
    return new Response(JSON.stringify({ error: 'studentId required' }), { status: 400 })
  }

  // 1. Authorize: the caller must be an authenticated counselor.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 })
  }
  const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  // 2. Service-role work: documents, then the auth identity (cascades the rest).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: objs } = await admin.storage.from(DOC_BUCKET).list(studentId, { limit: 1000 })
  if (objs?.length) {
    await admin.storage.from(DOC_BUCKET).remove(objs.map((o) => `${studentId}/${o.name}`))
  }

  const { error } = await admin.auth.admin.deleteUser(studentId)
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, studentId }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
