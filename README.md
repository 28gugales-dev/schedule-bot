# Waiver & Course-Scheduling Platform

High-school course-scheduling and waiver management platform with two separate portals: **Student** (intake & tracking) and **Counselor** (review & batch sync).

## Stack

- **React** 19.2.7 + **Vite** 8.0.16 (fast builds, HMR)
- **React Router** 7.18.0 (data router with role-gated views)
- **Tailwind CSS** 4.3.1 + `@tailwindcss/vite` (no config file, `@theme` tokens in CSS)
- **Supabase** 2.108.2 (Auth + DB + Storage; optional — runs locally in demo mode)
- **pdfjs-dist** 6.x (client-side PDF text extraction — no OCR/backend)

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
│   │   ├── CourseSwapPanel.jsx   # Two-column "drop X, replace with Y" picker
│   │   ├── RequestTracker.jsx    # 4-step status tracker
│   │   └── MyRequests.jsx        # Student's submission history
│   └── admin-review/
│       ├── ReviewQueue.jsx       # 1-by-1 rapid decision interface
│       ├── RubricBuilder.jsx     # Edit criteria + toggle waivers
│       └── BatchSyncDashboard.jsx # Batch IC sync with 60s countdown
├── services/
│   ├── api.js                    # Mock API (in-memory + localStorage)
│   ├── mockData.js               # Seed data (waivers, rubric, queue, submissions)
│   └── transcriptStore.js        # localStorage: previously uploaded transcripts/course lists
├── utils/
│   ├── schedulingLogic.js        # parseTranscriptData / evaluateAgainstRubric — real, rule-based
│   ├── transcriptParser.js       # Line-based transcript text → structured courses/grade/GPA
│   ├── courseListParser.js       # Free-text course list → canonical course names
│   ├── courseCatalog.js          # courses.tsv → catalog + prereq graph (Kahn's topo sort)
│   ├── ruleEngine.js             # Data-driven eligibility rules (prereq + min grade)
│   ├── levenshtein.js            # Edit-distance fuzzy course-name matching
│   ├── priorityQueue.js          # Binary min-heap — orders the counselor review queue
│   ├── dedupeHash.js             # FNV-1a fingerprint — rejects duplicate in-flight requests
│   ├── seatAvailability.js       # Placeholder seat/period CSP check (no real roster feed yet)
│   ├── nextCourseSuggestions.js  # BFS "what you're now eligible for" (bonus, non-blocking)
│   └── pdfText.js                # Client-side PDF → text via pdf.js
├── components/layout/
│   ├── AppShell.jsx              # Sidebar + header + role switcher (demo only)
│   └── FullScreenLoader.jsx
├── routes/
│   ├── router.jsx                # Route map
│   ├── RoleLanding.jsx           # "/" → role-based redirect
│   └── NotFound.jsx
└── lib/supabase.js               # Client factory + isSupabaseConfigured flag
```

`courses.tsv` (repo root) is the source of truth for the prerequisite/min-grade catalog `courseCatalog.js` parses.

### Key Contracts

- **AuthProvider** exposes: `session`, `user`, `role`, `demoMode`, `setRole()`, `signOut()`
- **ProtectedRoute** gates on role; redirects to own portal if wrong role
- **API layer** (api.js) takes session payloads (no userId passed from client)
- **Mock data** seeded with diverse review queue, submitted requests, and rubric criteria

## Features

### Student Portal (`/student`)

1. **New Request** — intake wizard
   - Drag-drop document uploads (PDF, TXT, CSV)
   - Transcript and course-list text is extracted client-side (pdf.js) and parsed into structured courses; each one is matched against `courses.tsv` exactly or, failing that, by Levenshtein similarity — shown as "recognized course" chips (exact vs. fuzzy match flagged)
   - "Found a previous transcript/course list — Apply?" reuses a prior upload (stored in localStorage) without re-uploading
   - Dynamic waiver type selection (only active types)
   - For course-affecting waiver types (Prerequisite Override, Grad Substitution, Schedule Conflict, Late Add/Drop): a two-column **course swap panel** — pick a course to drop on the left, search a scrollable, eligibility-checked list of replacements on the right (ineligible courses are grayed out with the failing reason; "None" option included)
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

## Algorithms

All eligibility/decision logic is **deterministic and rule-based — no AI/ML anywhere in this path**:

| Concern | Algorithm | Where |
|---|---|---|
| Course name recognition | Exact match, then Levenshtein edit-distance similarity | `utils/levenshtein.js`, `courseCatalog.js`, `transcriptParser.js`, `courseListParser.js` |
| Prerequisite structure | Directed graph; Kahn's algorithm for topological order / "what's unlocked" | `utils/courseCatalog.js` |
| Waiver eligibility | Data-driven rule engine (rules derived from each `courses.tsv` row, not hardcoded conditionals) | `utils/ruleEngine.js`, `utils/schedulingLogic.js` |
| "Gray out unavailable options" | Filter the catalog through the rule engine per render | `features/student-portal/CourseSwapPanel.jsx` |
| Class availability | Seat-capacity check, CSP-style (placeholder data — no real period/roster feed yet) | `utils/seatAvailability.js` |
| Counselor queue ordering | Binary min-heap priority queue (grad-risk grade weight + submission age) | `utils/priorityQueue.js` |
| Duplicate request prevention | FNV-1a hash fingerprint over student + waiver type + course swap | `utils/dedupeHash.js` |
| "What am I eligible for next" | BFS over the prerequisite graph from completed courses (bonus, non-blocking) | `utils/nextCourseSuggestions.js` |

`utils/schedulingLogic.js` is the seam where transcript text becomes structured data (`parseTranscriptData`) and structured data + the active rubric become a recommendation (`evaluateAgainstRubric`) — both are real implementations now, feeding the same `AlgorithmPanel` the counselor review queue already rendered against canned data.

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

Build includes 98 modules (all features in dependency graph).

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

3. **Real seat/period data**
   - Replace `utils/seatAvailability.js` placeholder data with the actual IC section/roster feed
   - Extend the eligibility rule engine with real schedule-conflict (CSP) constraints once period data exists

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
