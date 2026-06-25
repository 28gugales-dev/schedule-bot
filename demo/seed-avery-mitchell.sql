-- ════════════════════════════════════════════════════════════════════════════
-- demo/seed-avery-mitchell.sql — a permanent demo student for the counselor
-- review queue: "Avery Mitchell", grade 11, real transcript data (see
-- avery-mitchell-transcript.pdf in this folder), requesting a Prerequisite
-- Override to skip from Journalism I straight to Journalism III.
--
-- WHY auth.users: every relevant table (profiles, one_roster, requests)
-- chains back to auth.users via foreign key, so a synthetic "student" needs
-- a placeholder row there too — even though Avery never logs in herself.
-- This is a known-safe pattern for non-login demo records, but it IS a
-- direct write to an internal Supabase-managed table; review before running
-- against a real project.
--
-- IDEMPOTENT: safe to re-run any time to make sure Avery exists.
--   - auth.users / requests: ON CONFLICT DO NOTHING — re-running this will
--     never reset a request a counselor already admitted/denied during a
--     demo. (Use seed-avery-mitchell-reset.sql to put her back to pending.)
--   - profiles / one_roster / waiver_types: ON CONFLICT DO UPDATE — these
--     always refresh to the data below.
--
-- Run: paste into the Supabase SQL Editor and click Run (or `supabase db
-- execute -f demo/seed-avery-mitchell.sql` if using the CLI against a
-- linked project).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

do $$
declare
  avery_id   uuid := 'e1d0a000-0000-4000-8000-000000000001';
  request_id uuid := 'e1d0a000-0000-4000-8000-0000000a0001';
  avery_email text := 'avery.mitchell.demo@southforsyth.k12.ga.us';
  prereq_form_schema jsonb := '[
    {"id":"prereq-header","type":"sectionHeader","label":"Prerequisite details","content":"Tell us which prerequisite you want to skip and how it is already covered."},
    {"id":"prereq-name","type":"shortText","label":"Which prerequisite are you requesting to skip?","required":true,"helpText":"Use the course name as it appears in the catalog.","placeholder":"e.g. Algebra II","maxLength":120},
    {"id":"coverage","type":"longText","label":"How is the prerequisite already covered?","required":true,"helpText":"Prior course, test score, or relevant experience.","placeholder":""},
    {"id":"evidence-type","type":"select","label":"Type of evidence","required":true,"options":[
      {"value":"prior-course","label":"Prior course / transfer credit"},
      {"value":"test-score","label":"Standardized test score"},
      {"value":"summer-program","label":"Summer / community-college program"},
      {"value":"other","label":"Other"}
    ]},
    {"id":"evidence-file","type":"file","label":"Supporting evidence (optional)","required":false,"helpText":"Transcript excerpt, score report, or certificate.","accept":".pdf,.png,.jpg,.jpeg","multiple":false}
  ]'::jsonb;
  transcript_data jsonb := '{
    "gpa": 4.53429,
    "studentGrade": 11,
    "attendanceRate": 0.9915730337,
    "courses": [
      {"name":"Literature & Composition I Honors","mark":96,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"Biology Honors","mark":94,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"Geometry: Concepts & Connections Honors","mark":98,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"Intro to Software Technology","mark":100,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"AP Human Geography","mark":92,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"French I","mark":95,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"Visual Arts I","mark":98,"credit":1,"term":"2024-2025 Grade 09 Term 2"},
      {"name":"Literature & Composition II Honors","mark":93,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"Chemistry Honors","mark":95,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"Advanced Algebra: Concepts & Connections Honors","mark":97,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"AP World History","mark":90,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"AP Computer Science Principles","mark":98,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"French II","mark":94,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"AP Psychology","mark":96,"credit":1,"term":"2025-2026 Grade 10 Term 1"},
      {"name":"AP Environmental Science","mark":95,"credit":1,"term":"2025-2026 Grade 10 Term 2"},
      {"name":"AP Statistics","mark":97,"credit":1,"term":"2025-2026 Grade 10 Term 2"},
      {"name":"AP Pre-Calculus","mark":92,"credit":1,"term":"2025-2026 Grade 10 Term 2"},
      {"name":"World Geography/ US History in Film","mark":99,"credit":1,"term":"2025-2026 Grade 10 Term 2"},
      {"name":"Journalism I","mark":100,"credit":1,"term":"2025-2026 Grade 10 Term 2"},
      {"name":"General PE II","mark":100,"credit":1,"term":"2025-2026 Grade 10 Term 2"},
      {"name":"Personal Financial Literacy","mark":98,"credit":1,"term":"2025-2026 Grade 10 Term 2"}
    ],
    "completed": [
      "Literature & Composition I Honors","Biology Honors","Geometry: Concepts & Connections Honors",
      "Intro to Software Technology","AP Human Geography","French I","Visual Arts I",
      "Literature & Composition II Honors","Chemistry Honors","Advanced Algebra: Concepts & Connections Honors",
      "AP World History","AP Computer Science Principles","French II","AP Psychology",
      "AP Environmental Science","AP Statistics","AP Pre-Calculus","World Geography/ US History in Film",
      "Journalism I","General PE II","Personal Financial Literacy"
    ],
    "recognized": [],
    "unrecognized": []
  }'::jsonb;
  course_list jsonb := '["Journalism I","Adv. Weight Training","AP Biology","AP Calculus AB","AP World History","AP Psychology","French III"]'::jsonb;
  recommendation jsonb := '{
    "decision": "admit",
    "confidence": 1,
    "reason": "All checked requirements are satisfied.",
    "checks": [
      {"id":"min-gpa","label":"Minimum cumulative GPA (4.53 >= 2.5)","passed":true},
      {"id":"min-attendance","label":"Minimum attendance rate % (99 >= 85)","passed":true},
      {"id":"prereq-complete","label":"Prerequisite course completed","passed":true},
      {"id":"prior-credit","label":"Prior equivalent credit on transcript","passed":true},
      {"id":"no-conflict","label":"No unresolved schedule conflict","passed":true},
      {"id":"eligibility","label":"Eligible for \"Journalism III\"","passed":true},
      {"id":"reason-prereq","label":"Prerequisite waived — 2 steps ahead of \"Journalism I\" in this track","passed":true},
      {"id":"reason-grade","label":"Grade level 11 meets the requirement (>= 11)","passed":true}
    ]
  }'::jsonb;
  form_answers jsonb := '{
    "prereq-name": "Journalism II",
    "coverage": "Will take the course over summer through FVA.",
    "evidence-type": "summer-program"
  }'::jsonb;
begin
  -- A. Placeholder auth user (never used to sign in — student_id FK only).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    avery_id, 'authenticated', 'authenticated', avery_email,
    crypt('demo-no-login-' || gen_random_uuid()::text, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"student","name":"Avery Mitchell"}'::jsonb
  )
  on conflict (id) do nothing;

  -- B. Profile.
  insert into public.profiles (id, role, full_name, email, grade, gpa)
  values (avery_id, 'student', 'Avery Mitchell', avery_email, 11, 4.53)
  on conflict (id) do update set
    role = excluded.role, full_name = excluded.full_name, email = excluded.email,
    grade = excluded.grade, gpa = excluded.gpa;

  -- C. Authoritative SIS snapshot (what the counselor compares the request against).
  insert into public.one_roster (
    student_id, gpa, attendance_rate, grade_level, enrollment_status, last_sync,
    completed_courses, current_schedule
  ) values (
    avery_id, 4.53, 99, 11, 'Active', now(),
    '[
      {"name":"Literature & Composition I Honors","grade":"A","gradeYear":9,"term":"2024–25"},
      {"name":"Biology Honors","grade":"A","gradeYear":9,"term":"2024–25"},
      {"name":"Geometry: Concepts & Connections Honors","grade":"A","gradeYear":9,"term":"2024–25"},
      {"name":"Intro to Software Technology","grade":"A","gradeYear":9,"term":"2024–25"},
      {"name":"AP Human Geography","grade":"A-","gradeYear":9,"term":"2024–25"},
      {"name":"French I","grade":"A","gradeYear":9,"term":"2024–25"},
      {"name":"Visual Arts I","grade":"A","gradeYear":9,"term":"2024–25"},
      {"name":"Literature & Composition II Honors","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"Chemistry Honors","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"Advanced Algebra: Concepts & Connections Honors","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"AP World History","grade":"A-","gradeYear":10,"term":"2025–26"},
      {"name":"AP Computer Science Principles","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"French II","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"AP Psychology","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"AP Environmental Science","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"AP Statistics","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"AP Pre-Calculus","grade":"A-","gradeYear":10,"term":"2025–26"},
      {"name":"World Geography/ US History in Film","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"Journalism I","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"General PE II","grade":"A","gradeYear":10,"term":"2025–26"},
      {"name":"Personal Financial Literacy","grade":"A","gradeYear":10,"term":"2025–26"}
    ]'::jsonb,
    '[
      {"course":"Journalism I","period":1},
      {"course":"Adv. Weight Training","period":2},
      {"course":"AP Biology","period":3},
      {"course":"AP Calculus AB","period":4},
      {"course":"AP World History","period":5},
      {"course":"AP Psychology","period":6},
      {"course":"French III","period":7}
    ]'::jsonb
  )
  on conflict (student_id) do update set
    gpa = excluded.gpa, attendance_rate = excluded.attendance_rate,
    grade_level = excluded.grade_level, enrollment_status = excluded.enrollment_status,
    last_sync = excluded.last_sync, completed_courses = excluded.completed_courses,
    current_schedule = excluded.current_schedule, updated_at = now();

  -- D. Make sure the Prerequisite Override waiver type exists (it ships in
  -- the app's mock data, but the real waiver_types table starts empty until
  -- a counselor creates it via the Form Builder or it's seeded here).
  insert into public.waiver_types (id, name, description, active, required_docs, form_schema)
  values (
    'prereq-override', 'Prerequisite Override',
    'Skip a listed prerequisite when prior coursework or scores cover it.',
    true, '["courseList"]'::jsonb, prereq_form_schema
  )
  on conflict (id) do update set
    name = excluded.name, description = excluded.description, active = excluded.active,
    required_docs = excluded.required_docs, form_schema = excluded.form_schema;

  -- E. The request itself — pending, ready to admit/deny in the review queue.
  insert into public.requests (
    id, student_id, waiver_type_id, status, course_list, from_course, to_course,
    student_note, transcript_data, documents, recommendation, rule_version,
    student_snapshot, form_answers, form_schema_snapshot, consent_given_at, consent_version
  ) values (
    request_id, avery_id, 'prereq-override', 'submitted', course_list,
    'Journalism I', 'Journalism III',
    'Will take the course over summer through FVA.',
    transcript_data, '[]'::jsonb, recommendation, 'graduation_2026_demo',
    jsonb_build_object('name', 'Avery Mitchell', 'id', avery_id, 'grade', 11, 'gpa', 4.53),
    form_answers, prereq_form_schema, now(), 'ferpa-2026-06-23'
  )
  on conflict (id) do nothing;
end $$;
