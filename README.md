# Waiver & Course-Scheduling Platform

High-school course-scheduling and waiver management platform with two separate portals: **Student** (intake & tracking) and **Counselor** (review & batch sync).

## Stack

- **React** 19.2.7 + **Vite** 8.0.16 (fast builds, HMR)
- **React Router** 7.18.0 (data router with role-gated views)
- **Tailwind CSS** 4.3.1 + `@tailwindcss/vite` (no config file, `@theme` tokens in CSS)
- **Supabase** 2.108.2 (Auth + DB + Storage; optional — runs locally in demo mode)

## Quick Start

```bash
npm install
npm run dev
```

Server runs at **http://localhost:5173/**

### Demo Mode (Local, No Supabase)

By default, **no environment variables required**. App loads in **demo mode**:

- Login page shows role chooser: "Enter as Student" / "Continue as Counselor"
- Both portals fully functional with seeded mock data
- Role persists in localStorage; reset by signing out

**To add Supabase:**

Create `.env.local` with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

App auto-swaps to Google OAuth flow; demo mode disabled.

## Architecture

```
src/
├── features/
│   ├── auth/
│   │   ├── AuthProvider.jsx      # Context: session, role, demo mode, setRole()
│   │   ├── LoginPage.jsx         # Demo chooser OR Google SSO
│   │   └── ProtectedRoute.jsx    # Role boundary guard
│   ├── student-portal/
│   │   ├── WaiverIntake.jsx      # Wizard: uploads → waiver type → review & submit
│   │   ├── UploadZone.jsx        # Drag-drop file dropzone
│   │   ├── WaiverSelectGrid.jsx  # Card grid single-select
│   │   ├── RequestTracker.jsx    # 4-step status tracker
│   │   └── MyRequests.jsx        # Student's submission history
│   └── admin-review/
│       ├── ReviewQueue.jsx       # 1-by-1 rapid decision interface
│       ├── RubricBuilder.jsx     # Edit criteria + toggle waivers
│       └── BatchSyncDashboard.jsx # Batch IC sync with 60s countdown
├── services/
│   ├── api.js                    # Mock API (in-memory + localStorage)
│   ├── mockData.js               # Seed data (waivers, rubric, queue, submissions)
│   └── schedulingLogic.js        # Algo stubs (NotImplementedError)
├── components/layout/
│   ├── AppShell.jsx              # Sidebar + header + role switcher (demo only)
│   └── FullScreenLoader.jsx
├── routes/
│   ├── router.jsx                # Route map
│   ├── RoleLanding.jsx           # "/" → role-based redirect
│   └── NotFound.jsx
└── lib/supabase.js               # Client factory + isSupabaseConfigured flag
```

### Key Contracts

- **AuthProvider** exposes: `session`, `user`, `role`, `demoMode`, `setRole()`, `signOut()`
- **ProtectedRoute** gates on role; redirects to own portal if wrong role
- **API layer** (api.js) takes session payloads (no userId passed from client)
- **Mock data** seeded with diverse review queue, submitted requests, and rubric criteria

## Features

### Student Portal (`/student`)

1. **New Request** — intake wizard
   - Drag-drop document uploads (PDF, PNG, JPG)
   - Dynamic waiver type selection (only active types)
   - Submission review & submit
   - Inline 4-step tracker showing decision progress

2. **My Requests** — view past submissions + live status

### Counselor Portal (`/admin`)

1. **Review Queue** — unified 1-by-1 interface
   - Student info + documents + waiver type + current rubric scores
   - Giant "Admit" / "Deny" buttons for rapid decisions
   - Optimistic UI advance to next in queue

2. **Rubric Builder** — edit evaluation criteria
   - Add/remove criteria (number fields, boolean toggles)
   - Toggle waivers active/inactive
   - Dirty-gated Save button

3. **Batch Sync** — Infinite Campus integration
   - 60-second countdown auto-sync
   - "Force Sync Now" button
   - Status pills (synced/pending)

## Algorithm Boundary

Core logic is **stubbed, not implemented**:

- `parseTranscriptData(fileUrl)` — throws `NotImplementedError`
- `evaluateAgainstRubric(studentData, criteria)` — throws `NotImplementedError`

Both stubs document their return shapes. This scaffold layer handles all UI, routing, auth, and API calls; algorithm work is separate.

## Build & Deploy

```bash
# Dev
npm run dev

# Build (production)
npm run build   # outputs to dist/

# Type check
npm run type-check

# Preview production build locally
npm run preview
```

Build includes 83 modules (all features in dependency graph).

## Secrets Hygiene

- `.env.local` ignored (Git)
- `.env.example` committed (empty placeholders)
- No credentials in code or config files

## Next Steps (Open)

1. **Supabase setup**
   - Create project, get URL + anon key
   - Confirm Google OAuth redirect URL config
   - Set up Storage bucket + RLS for uploaded docs
   - Design + migrate user/submission/decision tables

2. **Infinite Campus API integration**
   - Mock `triggerBatchICPush` → real REST calls to IC
   - Sync waiver decisions to student transcript

3. **Algorithm implementation**
   - Transcript PDF parsing → structured data extraction
   - Rubric evaluation logic (score aggregation, pass/fail rules)
   - Tie into `RequestTracker` status workflow

4. **Email + audit logging**
   - Student submission confirmations
   - Counselor decision notifications
   - Activity audit trail (edits, approvals)

## Running on CI

Supabase env vars optional. CI runs against demo mode (all tests pass locally without creds).

```bash
npm ci
npm run build  # Green iff all modules in graph
```

## License

Internal project — contact team for access.
