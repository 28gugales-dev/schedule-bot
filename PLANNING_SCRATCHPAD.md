# PLANNING_SCRATCHPAD — Waiver / Course-Scheduling Platform

> External memory. Read at start of every task, update at end. Persists plan,
> decisions, statuses across long autonomous runs.

_Last updated: 2026-06-17 — Milestone 1 (harness + routing) complete & verified._

---

## 1. Mission

High-school course-scheduling & waiver platform. Two portals:
- **Student** — frictionless intake (uploads → waiver form → tracker).
- **Admin/Counselor** — config (rubric builder) + rapid 1-by-1 review + IC batch sync.

**Boundary rule (CRITICAL):** scaffold UI / state / API service calls only.
Do NOT implement core algorithm logic. Leave documented placeholder stubs for:
- `parseTranscriptData(fileUrl)`
- `evaluateAgainstRubric(studentData, criteria)`

## 2. Stack (resolved versions)

| Lib | Version | Notes |
|-----|---------|-------|
| react / react-dom | 19.2.7 | |
| vite | 8.0.16 | Node 24 ok |
| @vitejs/plugin-react | 6.0.2 | |
| tailwindcss + @tailwindcss/vite | 4.3.1 | v4 = vite plugin, `@import "tailwindcss"`, `@theme` tokens, NO config file |
| react-router-dom | 7.18.0 | data router (`createBrowserRouter`) |
| @supabase/supabase-js | 2.108.2 | Auth + DB + Storage |

## 3. Architecture decisions

- **Feature-first** dirs: `src/features/{auth,student-portal,admin-review}`.
- **Data router** (`createBrowserRouter`) in `src/routes/router.jsx`.
- **Auth**: `AuthProvider` (context) wraps `RouterProvider`. Session from Supabase;
  `onAuthStateChange` subscription. Role via `app_metadata.role` → `user_metadata.role`
  → default `'student'`. Re-enforce admin gating at DB layer (RLS) — client role not trusted for authz.
- **Stub mode**: if `VITE_SUPABASE_*` env missing, `supabase` client = null, AuthProvider
  degrades gracefully so UI renders for dev/CI without creds. Login button disabled + notice.
- **Role gating**: `<ProtectedRoute allow={[...]}>` — loader while resolving, redirect to
  /login if unauth, redirect to own portal if wrong role.
- **Files < 300 lines, one responsibility.**

## 4. File structure (current)

```
src/
  main.jsx                       AuthProvider > RouterProvider
  index.css                      tailwind import + @theme tokens
  lib/supabase.js                client factory (+ isSupabaseConfigured)
  routes/
    router.jsx                   route map (/, /login, /student, /admin, *)
    RoleLanding.jsx              "/" → role-based redirect
    NotFound.jsx                 404
  features/
    auth/
      AuthProvider.jsx           context + useAuth + resolveRole
      ProtectedRoute.jsx         role boundary guard
      LoginPage.jsx              Google SSO button
    student-portal/
      StudentHome.jsx            placeholder landing
    admin-review/
      AdminHome.jsx              placeholder landing
  components/layout/
    AppShell.jsx                 sidebar + header + <Outlet/>, portal-aware
    FullScreenLoader.jsx         spinner
```

## 5. Reuse map (from local-repo scan — `C:\Users\soham\lyzard-ui-overhaul`, Next.js16/React19/TW4/Supabase)

> Next.js app-router code → ADAPT to Vite + React Router (strip `'use client'`, `next/*`).
> Logic + Tailwind classes transfer directly.

| Need | Source file | Verdict |
|------|-------------|---------|
| Drag-drop PDF upload | `src/components/tools/UploadZone.tsx` | **COPY/ADAPT** — base for student uploads |
| Google SSO flow | `src/app/auth/page.tsx` | ADAPT — confirm our `signInWithOAuth` matches |
| Supabase browser client | `src/lib/supabase/client.ts` | REF (already wrote `lib/supabase.js`) |
| Collapsible sidebar | `src/components/UserSidebar.tsx` | ADAPT — could upgrade AppShell aside |
| Multi-step progress | `src/components/tools/ProcessingStep.tsx` | ADAPT — base for submission stepper |
| Form/radio/toggle patterns | `src/app/settings/settings-client.tsx` | ADAPT — base for Rubric Builder |
| Design tokens | `src/app/globals.css` | ADAPT — pull palette/radius/easing into our `@theme` |
| OCR text cleanup util | `src/lib/tools/chunks.ts` | REF-ONLY (algo boundary — stub side) |

Stack extras seen: Framer Motion, React-PDF, TipTap. Consider react-dropzone or reuse UploadZone for uploads.

## 6. Task status

- [x] **M1 — Harness + routing** (Execution steps 1–4)
  - [x] Project init (package.json, vite.config, index.html, css, main.jsx)
  - [x] PLANNING_SCRATCHPAD.md + file structure
  - [x] Local repo scan (reuse map above)
  - [x] Routing skeleton + auth boundaries (student vs admin)
  - [x] Layout shells + placeholder landings
  - [x] `npm install` + `npm run build` green
- [x] **M2 — API service layer + algo stubs** (Execution step 5)
  - [x] `src/services/mockData.js` — seed: WAIVER_TYPES, RUBRIC_CRITERIA, REVIEW_QUEUE, BATCH_SYNC_QUEUE
  - [x] `src/services/api.js` — async mocked fns: uploadStudentDocuments, fetchAvailableWaivers,
        submitWaiver, fetchRequestStatus, fetchReviewQueue, submitDecision, fetchRubricCriteria,
        updateRubricCriteria, fetchBatchSyncQueue, triggerBatchICPush. In-memory mutation + latency.
  - [x] `src/utils/schedulingLogic.js` — parseTranscriptData, evaluateAgainstRubric (throwing stubs,
        documented return shapes, NotImplementedError). ALGO BOUNDARY respected.
  - [x] `node --check` all 3 parse; `npm run build` green (not yet in graph until M3/M4 import).
- [x] **M3 — Admin portal** (step 6): Rubric Builder → 1-by-1 Queue → Batch Sync Dashboard
  - [x] `features/admin-review/ReviewQueue.jsx` — 1-by-1 unified info panel + giant Admit/Deny rapid action row, optimistic advance, empty state. `/admin` index.
  - [x] `features/admin-review/RubricBuilder.jsx` — edit criteria (number/boolean + enabled) + toggle waiver active/inactive, dirty-gated Save. `/admin/rubric`.
  - [x] `features/admin-review/BatchSyncDashboard.jsx` — 60s countdown auto-sync + Force Sync Now, status pills. `/admin/batch`.
  - [x] api.js gained `fetchAllWaivers` (rubric needs inactive too). Routes + AppShell admin nav wired. AdminHome deleted (replaced by ReviewQueue index).
  - [x] `npm run build` green, 79 modules (all 3 now in graph = validated). Built via 3 parallel sub-agents (2 sonnet, 1 haiku).
- [x] **M4 — Student portal** (step 7): Uploads → Waiver Form → Submission + Tracker stepper
  - [x] `features/student-portal/UploadZone.jsx` — controlled drag-drop dropzone, `File[]` in/out, immutable File objects, per-file remove. (haiku)
  - [x] `features/student-portal/WaiverSelectGrid.jsx` — controlled single-select card grid, radiogroup a11y, requiredDocs badge. (haiku)
  - [x] `features/student-portal/RequestTracker.jsx` — 4-step stepper (Submitted → Automated Review → Counselor Review → Decision), status→index map w/ graceful default, fetchRequestStatus. (sonnet)
  - [x] `features/student-portal/WaiverIntake.jsx` — wizard orchestrator (Documents → Waiver type → Review & submit → inline tracker). Owns state; flattens File[] → {name,size,docType} at the submit seam (no File mutation). Authored by orchestrator (= the integration root, per advisor). `/student` index.
  - [x] Router `/student` index swapped StudentHome → WaiverIntake; StudentHome.jsx deleted. Nav unchanged (single flow). Padding unified — stripped self `p-6` from RubricBuilder so all screens share AppShell's inset.
  - [x] `npm run build` green, 82 modules (79 + 4 new − 1 deleted; all leaves in-graph = validated). All 5 runtime prop-seams audited statically. Built via 3 parallel sub-agents (2 haiku, 1 sonnet) + orchestrator-authored root.
- [x] **M5 — Final self-verification** vs prompt.md (step 8)
  - [x] All §4 deliverables present (student: SSO, 3-way uploads, dynamic active-waiver grid, stub email + 4-step tracker; admin: rubric builder + active toggle, 1-by-1 unified panel, giant Admit/Deny, batch sync countdown + Force Sync).
  - [x] All §5 API fns present (upload/fetch/submit/queue/decision/rubric/IC push) + algo stubs (parseTranscriptData, evaluateAgainstRubric) throw NotImplementedError w/ documented return shapes. BOUNDARY respected — no real algo anywhere.
  - [x] Secrets hygiene: no .env tracked; .gitignore = .env/.env.* + !.env.example; .env.example empty placeholders only.
  - [x] `npm run build` green (82 modules). Dev server verified up at http://localhost:5173/.
  - [~] DEVIATION (intentional): mock signatures take session-scoped payloads, not client-passed userId (prompt §5 listed `uploadStudentDocuments(userId, files)` etc). userId belongs to the server session (auth.uid() under RLS) — passing it from the client is the anti-pattern the "don't trust client" constraint warns against. Bodies swap to Supabase without touching call sites.

**STATUS: scaffold COMPLETE. All 8 execution steps done. Uncommitted (all files `??`) — awaiting commit go-ahead.**

- [x] **M6 — Fully-local DEMO MODE** (user request: no Supabase/Google yet, lots of demo data to test)
  - [x] `AuthProvider.jsx` (orchestrator-authored): `demoMode = !isSupabaseConfigured`. Synthesizes a demo user from a role in localStorage (`demo_role`); exposes `demoMode`, `setRole(role|null)`. No login wall. Real Supabase path untouched — swaps back in automatically when env present. ProtectedRoute + RoleLanding need ZERO change.
  - [x] `LoginPage.jsx` (haiku): demo → "Enter as Student" / "Continue as Counselor" chooser (setRole + navigate('/')); real → original Google flow.
  - [x] `AppShell.jsx` (haiku): demo → header DEMO pill + Student/Counselor segmented switcher (explicit navigate both ways — student→admin won't auto-redirect). Student nav split: "New Request" + "My Requests".
  - [x] `mockData.js` (haiku): WAIVER_TYPES 5→8, RUBRIC_CRITERIA 4→7, REVIEW_QUEUE 3→12 (5 admit/3 deny/4 review), BATCH_SYNC_QUEUE 3→8, + new SEED_SUBMISSIONS (6, all 5 tracker statuses). Referential integrity: all waiverTypeIds canonical.
  - [x] `api.js` (haiku): submissions seeded from SEED_SUBMISSIONS; new `fetchMyRequests()`.
  - [x] `MyRequests.jsx` (haiku, NEW): `/student/requests` — lists seeded requests, each with live RequestTracker. Router wired (orchestrator).
  - [x] `npm run build` green, 83 modules (82 + MyRequests). All 5 runtime prop-seams read-audited (LoginPage chooser, AppShell switcher, MyRequests→RequestTracker, api seed init, AuthProvider contract vs every consumer). Built via 4 parallel haiku agents + orchestrator-authored AuthProvider + router.
  - [~] Live browser smoke test blocked: browser-harness needs Chrome remote-debugging toggle (chrome://inspect) — not enabled. Correctness covered by green build + full seam read.

## 7. Build/swarm strategy

- Harness = sequential tooling → direct exec (done).
- Component-heavy phases (M3/M4): fan out independent component files to haiku/sonnet
  sub-agents, each given the reuse-map source + acceptance criteria, then verify build.
- Verify each milestone: `npm run build` must pass before reporting.

## 8. Open questions / deferred

- Confirm Supabase Google OAuth redirect URL config when real creds added.
- Storage bucket name + RLS policies for uploaded docs (DB task, later).
- Infinite Campus push: fully mocked (`triggerBatchICPush`) — real API out of scope per boundary rule.
