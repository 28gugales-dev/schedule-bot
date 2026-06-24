// oneroster-pull — refresh the one_roster cache from Infinite Campus's OneRoster
// REST API (the "initial pull" baseline + the source the push re-reads fresh).
//
// SECURITY / FERPA:
//   - Service-role function; the CALLER must be an authenticated counselor.
//   - IC OAuth2 client-credentials live ONLY in this function's env (Supabase
//     Vault), never in the browser bundle.
//   - DATA MINIMIZATION: the raw IC response can carry prohibited demographics
//     (birthDate, gender, race, address, guardian contact — privacy-policy.md
//     §1.1). We run findProhibitedFields as a tripwire and persist ONLY the
//     allowlisted shape from minimizeStudentPull. If the tripwire fires we SKIP
//     persisting that student and log it — a prohibited field never reaches the DB.
//   - The shared, stress-tested fieldAllowlist module is imported directly (same
//     code as the app), so the ceiling cannot drift between app and server.
//
// SCOPE HONESTY: the OneRoster HTTP calls + the IC JSON→normalized mapping below
// are NOT exercised by the stress test (no live IC). They are a faithful
// implementation of the Phase-1-verified OneRoster v1.1/v1.2 read contract; the
// exact sourcedId mapping (open question Q4) needs a real district to confirm.
//
// Deploy:  supabase functions deploy oneroster-pull
// Invoke:  POST { "studentSourcedIds"?: string[] }  with the counselor's Authorization header
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { minimizeStudentPull, findProhibitedFields } from '../../../src/services/ic/fieldAllowlist.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const IC_BASE_URL = Deno.env.get('IC_ONEROSTER_BASE_URL') ?? ''     // literal Base URL IC generates
const IC_TOKEN_URL = Deno.env.get('IC_ONEROSTER_TOKEN_URL') ?? ''   // .../campus/oauth2/token?appName=<app>
const IC_CLIENT_ID = Deno.env.get('IC_ONEROSTER_CLIENT_ID') ?? ''
const IC_CLIENT_SECRET = Deno.env.get('IC_ONEROSTER_CLIENT_SECRET') ?? ''

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // 1. Authorize: caller must be an authenticated counselor.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  if (!IC_BASE_URL || !IC_TOKEN_URL || !IC_CLIENT_ID) {
    return json({ error: 'IC OneRoster credentials not configured', configured: false }, 503)
  }

  const body = await req.json().catch(() => ({}))
  const onlyIds: string[] | null = Array.isArray(body?.studentSourcedIds) ? body.studentSourcedIds : null

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  let token: string
  try {
    token = await getToken()
  } catch (e) {
    return json({ error: `IC token request failed: ${String(e)}` }, 502)
  }

  // 2. Read students + their enrollments/classes from IC, minimize, upsert.
  const summary = { pulled: 0, persisted: 0, skippedProhibited: 0, errors: [] as string[] }
  const students = await icGet(`/students${onlyIds ? '' : '?limit=100'}`, token).catch((e) => {
    summary.errors.push(`students: ${String(e)}`); return { users: [] }
  })
  const list = (students?.users ?? students?.students ?? []).filter((s: any) => !onlyIds || onlyIds.includes(s.sourcedId))

  for (const s of list) {
    summary.pulled += 1
    try {
      // FERPA tripwire — run on the RAW IC payload (the student record + the raw
      // classes response) BEFORE normalizing, so IC schema drift that introduces a
      // prohibited field (birthDate/sex/race/agents/...) is caught and the student
      // is skipped+logged. (assembleStudent below builds an allowlisted object, so
      // checking its output would never fire — the check must see the raw input.)
      const rawClasses = await icGet(`/users/${encodeURIComponent(s.sourcedId)}/classes`, token).catch(() => ({ classes: [] }))
      const prohibited = [...findProhibitedFields(s), ...findProhibitedFields(rawClasses)]
      if (prohibited.length) {
        summary.skippedProhibited += 1
        summary.errors.push(`student ${s.sourcedId}: prohibited fields present, skipped: ${[...new Set(prohibited)].join(', ')}`)
        continue
      }

      const raw = assembleStudent(s, rawClasses)
      const minimal = minimizeStudentPull(raw)
      const studentUuid = await resolveProfileId(admin, s)
      if (!studentUuid) { summary.errors.push(`student ${s.sourcedId}: no matching profile`); continue }

      const { error } = await admin.from('one_roster').upsert({
        student_id: studentUuid,
        sis_id: minimal.sisId ?? s.sourcedId,
        school_sourced_id: minimal.schoolSourcedId,
        gpa: minimal.gpa,
        attendance_rate: minimal.attendanceRate,
        grade_level: minimal.gradeLevel,
        enrollment_status: minimal.enrollmentStatus,
        last_sync: new Date().toISOString(),
        completed_courses: minimal.completedCourses ?? [],
        current_schedule: minimal.currentSchedule ?? [],
        updated_at: new Date().toISOString(),
      })
      if (error) summary.errors.push(`student ${s.sourcedId}: ${error.message}`)
      else summary.persisted += 1
    } catch (e) {
      summary.errors.push(`student ${s.sourcedId}: ${String(e)}`)
    }
  }

  return json({ ok: true, summary })

  // ── IC helpers ──────────────────────────────────────────────────────────────
  async function getToken(): Promise<string> {
    const res = await fetch(IC_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: IC_CLIENT_ID,
        client_secret: IC_CLIENT_SECRET,
      }),
    })
    if (!res.ok) throw new Error(`token ${res.status}`)
    const j = await res.json()
    return j.access_token
  }

  async function icGet(path: string, tok: string): Promise<any> {
    const res = await fetch(`${IC_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${tok}` } })
    if (!res.ok) throw new Error(`${path} -> ${res.status}`)
    return res.json()
  }

  // Join the OneRoster objects into the normalized shape fieldAllowlist expects.
  // enrollment links user→class; the CLASS object carries period/term, so we read
  // the student's classes for currentSchedule. completedCourses would come from
  // results/transcript (district-specific) — left empty here pending Q4 mapping.
  function assembleStudent(s: any, classesResp: any) {
    const classes = classesResp?.classes ?? []
    return {
      sisId: s.sourcedId,
      schoolSourcedId: s.org?.sourcedId ?? s.orgs?.[0]?.sourcedId ?? null,
      gpa: s.metadata?.gpa ?? null,
      attendanceRate: s.metadata?.attendanceRate ?? null,
      gradeLevel: Array.isArray(s.grades) ? Number(s.grades[0]) : (s.grade ?? null),
      enrollmentStatus: s.status === 'active' ? 'Active' : (s.status ?? null),
      lastSync: new Date().toISOString(),
      completedCourses: [],
      currentSchedule: classes.map((c: any) => ({
        course: c.title ?? c.course?.title ?? null,
        period: Array.isArray(c.periods) ? Number(c.periods[0]) : null,
        classSourcedId: c.sourcedId ?? null,
      })),
    }
  }

  async function resolveProfileId(admin: any, s: any): Promise<string | null> {
    // Map the IC student to our profile. Prefer an existing one_roster.sis_id link;
    // fall back to matching school email. (Q4: exact key strategy is district-specific.)
    const email = s.email ?? null
    if (email) {
      const { data } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
      if (data?.id) return data.id
    }
    const { data } = await admin.from('one_roster').select('student_id').eq('sis_id', s.sourcedId).maybeSingle()
    return data?.student_id ?? null
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
