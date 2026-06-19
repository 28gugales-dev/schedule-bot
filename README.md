# Waiver & Course-Scheduling Platform

High-school course-scheduling and waiver management platform with two separate portals: **Student** (intake & tracking) and **Counselor** (review & batch sync).

## Stack

- **React** 19.2.7 + **Vite** 8.0.16 (fast builds, HMR)
- **React Router** 7.18.0 (data router with role-gated views)
- **Tailwind CSS** 4.3.1 + `@tailwindcss/vite` (no config file, `@theme` tokens in CSS) — "Apple-glass" frosted design system (`.glass-card` / `.glass-input`) in `src/index.css`
- **Supabase** 2.108.2 (Auth + DB + Storage; optional — runs locally in demo mode)
- **pdfjs-dist** 6.x (client-side PDF text extraction — no OCR/backend)
- **AG Grid** 35.x (`ag-grid-community` + `ag-grid-react`) — sortable/filterable counselor review queue
- **Vitest** 4.x (`npm test`) — unit coverage for the algorithm layer

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
│   │   ├── CourseListEntry.jsx   # Per-period course text boxes + type-ahead + live match
│   │   ├── WaiverSelectGrid.jsx  # Card grid single-select
│   │   ├── CourseSwapPanel.jsx   # Two-column "drop X, replace with Y" picker
│   │   ├── RequestTracker.jsx    # 4-step status tracker
│   │   └── MyRequests.jsx        # Student's submission history
│   └── admin-review/
│       ├── ReviewQueue.jsx       # AG Grid review list → click a row for detail
│       ├── ReviewDetail.jsx      # Submission vs. OneRoster SIS + rubric verification accordion
│       ├── RubricBuilder.jsx     # Edit criteria + toggle waivers
│       └── BatchSyncDashboard.jsx # Batch IC sync with 60s countdown
├── components/ui/LiquidGlass.jsx # Floating glass chrome decoration
├── services/
│   ├── api.js                    # Mock API (in-memory + localStorage)
│   ├── mockData.js               # Seed data (waivers, rubric, queue, OneRoster, submissions)
│   └── transcriptStore.js        # localStorage: previously uploaded transcripts/course lists
├── utils/
│   ├── schedulingLogic.js        # parseTranscriptData / evaluateAgainstRubric — real, rule-based
│   ├── transcriptParser.js       # Line-based transcript text → structured courses/grade/GPA/attendance
│   ├── courseListParser.js       # Free-text course list → canonical course names
│   ├── courseCatalog.js          # courses.tsv → catalog + prereq graph (Kahn's topo sort)
│   ├── ruleEngine.js             # Data-driven eligibility rules (prereq + min grade)
│   ├── levenshtein.js            # Word-overlap + edit-distance fuzzy course-name matching
│   ├── conflictDetection.js      # Interval-overlap schedule-conflict detection
│   ├── dependencyAnalysis.js     # DFS "what does dropping this course break" impact analysis
│   ├── equivalencyGraph.js       # Weighted course-equivalency clustering (AP/Honors/base)
│   ├── explanationEngine.js      # Rich pass/fail reasons with actual values plugged in
│   ├── ruleVersion.js            # Immutable, content-hashed rubric snapshot per submission
│   ├── batchProcessor.js         # Map-reduce sync-package builder for IC batch push
│   ├── priorityQueue.js          # Binary min-heap + IndexedPriorityQueue (id-based update/remove)
│   ├── rateLimiter.js            # Token-bucket submission throttling per student
│   ├── dedupeHash.js             # FNV-1a fingerprint — rejects duplicate in-flight requests
│   ├── seatAvailability.js       # Placeholder seat/period CSP check (no real roster feed yet)
│   ├── nextCourseSuggestions.js  # BFS "what you're now eligible for" (bonus, non-blocking)
│   ├── pdfText.js                # Client-side PDF → text via pdf.js
│   └── __tests__/                # Vitest coverage matrix + per-module smoke tests
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
   - Transcript upload (PDF or TXT) extracted client-side (pdf.js) and parsed into structured courses, grade, GPA, and attendance — matched against `courses.tsv` exactly or, failing that, by word-overlap + Levenshtein similarity — shown as "recognized course" chips (exact vs. fuzzy match flagged)
   - Course list entered as seven per-period text boxes (+ "Add a course" for special cases) with a live type-ahead dropdown and the matched catalog name shown next to each box as you type
   - "Found a previous transcript/course list — Apply?" reuses a prior submission's entries (stored in localStorage) without retyping
   - Dynamic waiver type selection (only active types)
   - For course-affecting waiver types (Prerequisite Override, Grad Substitution, Schedule Conflict, Late Add/Drop): a two-column **course swap panel** — pick a course to drop on the left, search a scrollable, eligibility-checked list of replacements on the right. Ineligible courses are grayed out with the failing reason (prereq, grade, seat, or schedule conflict); eligible ones show *why* ("Meets prerequisite: ...", "Intro course — no prerequisite required"). Dropping a course that other courses depend on shows a dependency-impact warning. "None" option included.
   - Submission review & submit (rate-limited per student)
   - Inline 4-step tracker showing decision progress

2. **My Requests** — view past submissions + live status

### Counselor Portal (`/admin`)

1. **Review Queue** — AG Grid list (sortable, filterable) ordered by urgency; click a row to open the detail view
   - **Review Detail** — the student's submission side-by-side with the authoritative OneRoster (SIS) record, plus a collapsible rubric-verification accordion (failed checks expanded by default, each showing claimed vs. actual vs. reasoning)
   - Admit/Deny actions with an optional note, toast confirmation on decision

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
| Course name recognition | Exact match, then word-overlap + Levenshtein edit-distance similarity | `utils/levenshtein.js`, `courseCatalog.js`, `transcriptParser.js`, `courseListParser.js` |
| Prerequisite structure | Directed graph; Kahn's algorithm for topological order / "what's unlocked" | `utils/courseCatalog.js` |
| Waiver eligibility | Data-driven rule engine (rules derived from each `courses.tsv` row, not hardcoded conditionals) | `utils/ruleEngine.js`, `utils/schedulingLogic.js` |
| "Gray out unavailable options" | Filter the catalog through the rule engine per render | `features/student-portal/CourseSwapPanel.jsx` |
| Class availability | Seat-capacity check, CSP-style (placeholder data — no real period/roster feed yet) | `utils/seatAvailability.js` |
| Schedule conflicts | Interval-overlap detection (`startA < endB && startB < endA`) over fixed period times | `utils/conflictDetection.js` |
| Dependency impact | DFS over the prerequisite graph — "what does dropping this course break" | `utils/dependencyAnalysis.js` |
| Course equivalency | Weighted graph clustering AP/Honors/base variants of the same subject | `utils/equivalencyGraph.js` |
| Explainability | Every check returns *why*, with actual values, not just true/false | `utils/explanationEngine.js` |
| Rule versioning | Immutable, content-hashed rubric snapshot stamped on each submission | `utils/ruleVersion.js` |
| Batch processing | Map-reduce over approved waivers into one IC sync package | `utils/batchProcessor.js` |
| Counselor queue ordering | Binary min-heap priority queue (grad-risk grade weight + submission age); `IndexedPriorityQueue` supports O(log n) priority updates/removal by id | `utils/priorityQueue.js` |
| Duplicate request prevention | FNV-1a hash fingerprint over student + waiver type + course swap | `utils/dedupeHash.js` |
| Submission rate limiting | Token bucket, per student | `utils/rateLimiter.js` |
| "What am I eligible for next" | BFS over the prerequisite graph from completed courses (bonus, non-blocking) | `utils/nextCourseSuggestions.js` |

`utils/schedulingLogic.js` is the seam where transcript text becomes structured data (`parseTranscriptData`) and structured data + the active rubric become a recommendation (`evaluateAgainstRubric`) — both are real implementations, feeding the `ReviewDetail` rubric-verification accordion the counselor review queue renders.

## Testing

```bash
npm test   # vitest run — algorithm layer coverage
```

`src/utils/__tests__/eligibility.test.js` is the coverage matrix (missing prerequisite, wrong grade, full class, valid waiver, duplicate request, schedule conflict — each asserted blocked/allowed/rejected as expected). `algorithms.test.js` smoke-tests every newer module (dependency analysis, equivalency graph, rule versioning, rate limiter, batch processor, indexed priority queue, explanation engine).

## Build & Deploy

```bash
# Dev
npm run dev

# Build (production)
npm run build   # outputs to dist/

# Unit tests
npm test

# Preview production build locally
npm run preview
```

Build includes 110 modules (all features in dependency graph).

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
   - Replace `utils/seatAvailability.js` placeholder data with the actual IC section/roster feed (schedule-conflict detection in `utils/conflictDetection.js` already runs against whatever periods that feed supplies)

4. **Email + audit logging**
   - Student submission confirmations
   - Counselor decision notifications
   - Activity audit trail (edits, approvals)

## Running on CI

Supabase env vars optional. CI runs against demo mode (all tests pass locally without creds).

```bash
npm ci
npm test       # vitest run
npm run build  # Green iff all modules in graph
```

## License

Internal project — contact team for access.
