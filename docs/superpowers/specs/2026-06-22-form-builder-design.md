# Dynamic Form Builder — Design Specification

**Date:** 2026-06-22
**Status:** Approved (design); pending implementation plan
**Feature:** Counselors author custom forms (per waiver type) that students fill out during waiver intake; counselors review the answers.

---

## 1. Overview & goals

Counselors can define arbitrary custom fields per waiver type — a dynamic form builder. Students answer those fields inside the existing intake wizard. Counselors see the answers during review.

**The AUGMENT model (locked).** Custom fields are *additive*, never a replacement:

- The existing student wizard stays intact: transcript upload, course-list entry, course-swap panel. Custom fields are an **additional, conditionally-present step** inserted *after* waiver-type selection.
- The **AI recommendation/rubric engine is untouched.** `evaluateAgainstRubric(studentData, criteria)` reads only `transcriptData` / `courseList` / `fromCourse` / `toCourse` / `missingDocs`. Custom answers travel in a **separate `formAnswers` namespace** and are **never** merged into the object handed to the engine. (Verified: api.js:268-273, supabaseApi.js:100-105 build the arg object explicitly and exclude `formAnswers`.)
- **Backward compatible by construction.** The 8 seeded waiver types get `formSchema: []` (column default `'[]'::jsonb`). Empty/missing schema → the wizard skips the step entirely, the engine path is byte-for-byte identical to today, and legacy requests (no `formAnswers`) render nothing extra.

**v1 field types (11, locked, camelCase tokens):** `shortText`, `longText`, `number`, `date`, `select`, `radio`, `multiCheckbox`, `yesNo`, `file`, `sectionHeader` (display-only), `helpText` (display-only).

**Out of scope (YAGNI v1):** conditional/branching logic; real file Storage (files keep the existing stubbed-URL descriptor path, parity with today's `documents[]`); per-field querying / a relational `form_fields` table; Layer-B component render tests (deferred — Layer-A pure-logic tests gate this feature).

---

## 2. Locked decisions

### 2a. Resolved by the design (conflict resolutions)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Field-type tokens are **camelCase** (`shortText`…`helpText`) | App code is camelCase everywhere (`requiredDocs`, `courseList`). Tokens live inside JSONB values, never become column names. |
| D2 | Field identifier = **`id`** (slug, unique within form, **immutable after first submission** — convention, see R-m3) | Matches RubricBuilder's `makeUniqueId`/criterion `.id`. |
| D3 | Schema column = **`form_schema`** (DB) ⇄ **`formSchema`** (app) | Reads as a peer of existing `rule_version` / `student_snapshot` snapshot columns and the `required_docs` jsonb precedent. |
| D4 | Answer column = **`form_answers`** (DB) ⇄ **`formAnswers`** (app) | Pairs with `form_schema` / `form_schema_snapshot`. |
| D5 | Snapshot = **`form_schema_snapshot` jsonb** (full frozen array, optional `frozenAt` ISO string, **no hash**) | Mirrors `rule_version` (`freezeRuleVersion` already inlines the full frozen array — ruleVersion.js:12-22). YAGNI on dedup/version table. |
| D6 | Answer shape = **keyed map `{id: value}`**; labels/types/order come from `form_schema_snapshot` | Snapshot already carries label+type+order frozen at submit; per-answer duplication is redundant. Render = zip `snapshot[] × answers[id]`. |
| D7 | Builder = **new route `/admin/forms` (`FormBuilder.jsx`)** as the authoritative CRUD + schema surface | Rubric = scoring rules the AI reads; Forms = the question set the student answers. Different mental models. |
| D8 | Gateway = **per-entity** `createWaiverType` / `updateWaiverType` / `deleteWaiverType` + `fetchWaiverTypeForm`. Schema save = `updateWaiverType(id, { formSchema })` | Maps 1:1 to RLS reasoning, audit actions, and concurrency. No whole-array writer. |
| D9 | Delete = **soft-delete only** (`active=false`) | The live FK `requests_waiver_type_id_fkey` is NO ACTION — a hard DELETE on a type with request history throws at the DB. Snapshotting makes soft-delete lossless. |
| D10 | Migration files: **`0001b_base_schema.sql`** (backfill) + **`0002_form_builder.sql`** | See §2b/B1. |
| D11 | File answer = **inline descriptor `{id,name,type,size,url}`** in the answer, *and* the same descriptor stays in `documents[]`; `docType:'custom-field:<id>'` | Counselor renderer needs a `url`. Namespaced docType prevents `findMissingDocs` collision (verified api.js:222-234). |
| D12 | **No new RLS policy** | Existing whole-row policies (`waiver_types_manage_counselor` FOR ALL, `waiver_types_select_all`, `requests_insert_own`) automatically govern the new JSONB columns (RLS is row-level, not column-level). |

### 2b. Resolved by the user (this session)

| # | Decision |
|---|----------|
| U1 | **Scope:** full dynamic builder. |
| U2 | **Relationship to wizard:** AUGMENT (keep core wizard + AI engine; custom fields are an extra step). |
| U3 | **Field types:** all 11 (core text + choice + file + section/help). |
| U4 | **B1 base migration:** **backfill** the base DDL — write `0001b_base_schema.sql` capturing the real `CREATE` for `profiles`/`waiver_types`/`requests` + `private.is_counselor()` + RLS policies (reverse-engineered from the live project via the Supabase MCP), then `0002_form_builder.sql` adds the form columns. Repo becomes reproducible on a clean project. |
| U5 | **RubricBuilder waiver section:** becomes a **read-only summary with "Manage in Form Builder →" link**. RubricBuilder owns only AI criteria. One writer for `waiver_types`. |
| U6 | **File storage:** **defer** — file answers carry the existing stubbed `{id,name,type,size,url}` descriptor (parity with today's `documents[]`). Real Supabase Storage = later slice. |
| U7 | **Tests:** **Layer A only** (pure-logic vitest; no new deps). Layer-B render tests deferred. |
| U8 | **Defaults accepted:** full snapshot (no hash); concurrency = last-write-wins + `updatedAt` audit stamp; all form authoring gated to DB-`admin` role (`private.is_counselor()` bridges app-"counselor" → DB-`admin`). |

---

## 3. Architecture

### Component map

```
STUDENT SIDE                                COUNSELOR SIDE
─────────────                               ──────────────
WaiverIntake.jsx (EDIT)                     FormBuilder.jsx (NEW, route /admin/forms)
 ├ steps[] = useMemo (replaces STEPS const)   ├ left rail: waiver-type list (active dot,
 ├ Documents step      (unchanged)            │    N-fields badge, + New, ✕ soft-delete)
 ├ Waiver type step    (unchanged)            ├ right pane: type meta (name/desc/active/requiredDocs)
 ├ Additional questions (NEW, conditional)──┐ │   ├ custom-fields list (add palette / ▲▼ reorder / ✕)
 │   └ FieldRenderer.jsx (NEW, editable)    │ │   ├ FieldConfigPanel.jsx (NEW, per-field config)
 └ Review & submit step (unchanged)         │ │   └ Preview toggle ──┐
                                            │ │                       ▼
ReviewDetail.jsx (EDIT)                     └─┴──────►  FieldRenderer.jsx (read-only in preview)
 └ SubmissionBlock + RawSubmission:
   + <CustomAnswers> (snapshot × answers)   utils/formSchema.js (NEW, pure):
   + filter custom-field:* from docs loop     buildDefaults · validateForm · validateSchema
                                              · FIELD_REGISTRY metadata · default-field factory
ReviewQueue.jsx — NO custom columns           · makeUniqueId (ported from RubricBuilder)

RubricBuilder.jsx (EDIT): waiver section → read-only "Manage in Form Builder →" link
```

**Shared render seam.** One file, **`FieldRenderer.jsx`**, drives the 11-type switch. The student wizard mounts it editable (`onChange` wired, `errors` from validation); the builder preview mounts it read-only (`onChange` no-op). Preview fidelity is guaranteed by construction — the counselor sees exactly what the student will see.

### How it plugs in

- **Nav/route:** one entry in `navConfig.jsx` (the `admin` array, `Review` section) + one route in `router.jsx` under the already-`allow={['admin']}` `/admin` parent. Both shells consume `NAV` → no AppShell/GlassShell/EnterpriseShell change.
- **Gateway:** every component calls `services/api.js`, which guards on `isSupabaseConfigured` and delegates to `supabaseApi.js` or runs the demo body. New functions follow this exact pattern (§6).
- **Snapshot spine:** extends the *existing* `rule_version` / `student_snapshot` immutability pattern already on `requests`. No new persistence idiom.

---

## 4. Data model

### 4a. Decision: JSONB columns, not a relational `form_fields` table

Forms are read-whole / written-whole, never queried field-by-field (conditional logic is out). Every structured column on these tables is already JSONB (`required_docs`, `documents`, `recommendation`, `transcript_data`, `rule_version`, `student_snapshot`). A table would double the demo/Supabase parity surface, add ordering/reindex logic, and still serialize to JSONB at snapshot time. JSONB wins on every axis for v1.

### 4b. `waiver_types.form_schema` — ordered field-definition array (jsonb, default `[]`)

```jsonc
// One entry per field. Array order = display order. id stable across reorder/relabel.
{
  "id": "why-substitution",        // slug, unique within form, immutable after first submission
  "type": "longText",              // one of the 11 camelCase tokens
  "label": "Why are you requesting this substitution?",
  "required": false,               // ignored for sectionHeader/helpText
  "helpText": "Explain the equivalency you believe applies.",  // optional → aria-describedby
  "placeholder": "",               // text / number / select
  "options": [{ "value": "ap", "label": "AP credit" }],        // select | radio | multiCheckbox ONLY
  "min": null, "max": null, "step": null,                       // number ONLY
  "maxLength": null,               // shortText | longText (optional)
  "accept": ".pdf,.png,.jpg,.jpeg", "multiple": false,         // file ONLY
  "content": ""                    // sectionHeader | helpText ONLY (body copy; no input, no answer)
}
```

Type-specific keys are present only when meaningful. The 8 seeds get `[]`.

### 4c. `requests.form_answers` — keyed answer map (jsonb, default `{}`)

```jsonc
{
  "why-substitution": "I transferred districts mid-year",   // shortText / longText  → string
  "credits":          42,                                    // number               → JSON number
  "incident-date":    "2026-05-14",                          // date                 → ISO yyyy-mm-dd
  "period":           "p3",                                  // select / radio       → option value
  "reasons":          ["medical", "family"],                 // multiCheckbox        → array of values
  "approved":         true,                                  // yesNo                → boolean
  "physician-note":   { "id": "doc-…", "name": "note.pdf",
                        "type": "custom-field:physician-note",
                        "size": 84213, "url": "/mock/uploads/…" }   // file → descriptor
}
```

Display-only types (`sectionHeader`, `helpText`) produce **no** answer key.

### 4d. `requests.form_schema_snapshot` — frozen schema (jsonb, default `[]`)

A deep copy of `form_schema` taken **at submit time**. Counselor review renders **exclusively** from `form_schema_snapshot × form_answers` — never from the live `waiver_types.form_schema`. This makes all of §8's edit/delete safety trivial: editing or deleting a field/type cannot corrupt history because every request carries its own frozen copy. Mirrors `rule_version` exactly. Optional `frozenAt` ISO string alongside; no hash.

### 4e. Migrations

**B1 fix — backfill base schema first.** Only `supabase/migrations/0001_audit.sql` is tracked today; the `requests`/`waiver_types`/`profiles` DDL, `private.is_counselor()`, and the RLS policies exist in the *live* project but in **no tracked SQL** (they live only as prose in `docs/superpowers/specs/2026-06-22-supabase-auth-slice-design.md`). `0002` would `ALTER` tables with no tracked `CREATE`. Therefore:

1. **`supabase/migrations/0001b_base_schema.sql`** (NEW) — reverse-engineer the real DDL from the live project (via Supabase MCP `list_tables` / `execute_sql` against `pg_policies`, `information_schema`): `CREATE TABLE profiles / waiver_types / requests`, the `private.is_counselor()` function, and the three policy families (`waiver_types_manage_counselor` FOR ALL, `waiver_types_select_all`, `requests_*`). Idempotent (`if not exists` / `drop … if exists` before `create`). This makes the migration chain reproducible on a clean project.

2. **`supabase/migrations/0002_form_builder.sql`** (NEW) — additive form columns + JSONB type guards. No new RLS policy (D12). Draft:

```sql
-- 0002_form_builder.sql — Dynamic form builder. Additive + idempotent.
-- Defaults make the 8 seeded waiver types + all existing requests backward-compatible
-- (zero custom fields/answers), so the legacy wizard + AI rubric paths are unchanged.

alter table public.waiver_types
  add column if not exists form_schema jsonb not null default '[]'::jsonb;
alter table public.waiver_types
  drop constraint if exists waiver_types_form_schema_is_array;
alter table public.waiver_types
  add constraint waiver_types_form_schema_is_array
  check (jsonb_typeof(form_schema) = 'array');

alter table public.requests
  add column if not exists form_answers          jsonb not null default '{}'::jsonb,
  add column if not exists form_schema_snapshot  jsonb not null default '[]'::jsonb;
alter table public.requests
  drop constraint if exists requests_form_answers_is_object;
alter table public.requests
  add constraint requests_form_answers_is_object
  check (jsonb_typeof(form_answers) = 'object');
alter table public.requests
  drop constraint if exists requests_form_schema_snapshot_is_array;
alter table public.requests
  add constraint requests_form_schema_snapshot_is_array
  check (jsonb_typeof(form_schema_snapshot) = 'array');

-- RLS: NO NEW POLICY. Existing whole-row policies govern the new columns:
--   waiver_types_manage_counselor (FOR ALL, is_counselor())  → counselor CRUD incl. form_schema
--   waiver_types_select_all (SELECT true)                    → students read; client filters active
--   requests_insert_own (INSERT, student_id = auth.uid())    → student writes answers/snapshot on own row
```

Apply via `supabase db push` or the SQL editor (matches the `0001_audit.sql` convention). Note: keep `form_schema_snapshot` as **`jsonb`** — do not copy the auth-slice spec's latent `rule_version text` declaration (R-m1).

### 4f. Demo-mode equivalent (`mockData.js` + localStorage)

Exact parity by extending existing mock shapes — no new mock arrays.

- **`mockData.js` `WAIVER_TYPES`:** add `formSchema: []` to all 8 seeds. Add **one richly-populated example** type (e.g. Medical Exemption) with sectionHeader + shortText + multiCheckbox + file + yesNo so the builder/intake render non-empty in demo mode.
- **Submissions:** demo `submitWaiver` builds an explicit queue/submission literal — `formAnswers` + `formSchemaSnapshot` must be added to that literal (see M3). Optionally seed one submission with answers for demo coverage.
- **localStorage:** `waivers`/`submissions`/`queue` already persist whole via `persist()`; the new properties are extra JSON keys — no new `LS_KEYS`.
- **REQUIRED: bump `SEED_VERSION` `'1' → '2'` (api.js:66).** Per the *Audit seed version gate* lesson: changing the `WAIVER_TYPES` fixture shape without bumping `SEED_VERSION` leaves returning demo browsers on the stale cached seed (no `formSchema`), silently breaking the builder. (`ensureSeeded` api.js:106-146 only rehydrates when `lsRead(version) !== SEED_VERSION`.)

**Parity table**

| Concept | Supabase | Demo |
|---|---|---|
| Form schema | `waiver_types.form_schema jsonb` | `WAIVER_TYPES[].formSchema` (LS `waivers`) |
| Mapper | `formSchema: w.form_schema ?? []` in waiver read-mappers + write payload | n/a (already camelCase) |
| Student answers | `requests.form_answers jsonb` | `request.formAnswers` |
| File answers | descriptor `{id,name,type,size,url}` (stubbed url) | identical |
| Snapshot | `requests.form_schema_snapshot jsonb` | `request.formSchemaSnapshot` |
| Cache invalidation | n/a | bump `SEED_VERSION` → `'2'` |

---

## 5. Student renderer

### 5a. Inserting the conditional step

`selectedWaiverId` is chosen at step 1, custom fields belong to the selected type → the step **must** follow selection:

```
Documents (0) → Waiver type (1) → [Additional questions (conditional)] → Review & submit
```

**Trap (verified):** `STEPS` (WaiverIntake.jsx:17) is a module const but gating keys off **integer literals** (`step === 0/1`, `step < 2`, `step === 2`) and `WizardSteps` is index-based. Inserting a step shifts the Review index → index-based gating breaks for the Review step. **Fix — convert to identity/key-based gating:**

```jsx
const hasCustomFields = (selectedWaiver?.formSchema?.length ?? 0) > 0
const steps = useMemo(() => [
  { key: 'documents', label: 'Documents' },
  { key: 'waiver',    label: 'Waiver type' },
  ...(hasCustomFields ? [{ key: 'custom', label: 'Additional questions' }] : []),
  { key: 'review',    label: 'Review & submit' },
], [hasCustomFields])
const currentKey = steps[step]?.key
const isLastStep  = step === steps.length - 1
```

Gate by **key**: `canAdvance` switches on `currentKey` (add a `custom` case → §5c); Continue/Submit uses `isLastStep`; review block guards on `currentKey === 'review'`. `setStep(s => Math.min(steps.length-1, s+1))` stays length-based.

**Stale-state guards:**

```jsx
useEffect(() => { setCustomAnswers({}); setCustomErrors({}) }, [selectedWaiverId]) // clear prior type's answers
useEffect(() => { setStep(s => Math.min(s, steps.length - 1)) }, [steps.length])   // clamp if array shrank
```

### 5b. `FieldRenderer.jsx` (the shared seam)

Controlled; lifts all answer state to `WaiverIntake` (matches `CourseListEntry`/`CourseSwapPanel`). No internal answer state, no child→parent validity effect (avoids the useEffect-sync anti-pattern).

```jsx
// props: fields, answers:{[id]:value}, onChange:(id,value)=>void, errors:{[id]:msg}, readOnly?
// FieldShell wraps every input: <label htmlFor>/<legend>, helpText (aria-describedby),
// required *, inline error <p role="alert" id={`${id}-err`}>. Reuses glass-input,
// text-ink, text-muted, text-danger-700 dark:text-danger-300 tokens.
```

Per-type rendering:

| type | control | answer value | notes |
|---|---|---|---|
| shortText | `<input type=text>` | string | `placeholder`, `maxLength` |
| longText | `<textarea rows=3>` | string | |
| number | `<input type=number inputMode=decimal>` | **string in state**, coerced at validate/submit | `min`/`max`/`step`; never `Number('')` on keystroke |
| date | `<input type=date>` | ISO string | |
| select | `<select>` + disabled placeholder | option value | |
| radio | `<fieldset role=radiogroup><legend>` + native radios sharing `name` | option value | |
| multiCheckbox | `<fieldset><legend>` + N checkboxes | `string[]` | toggle add/remove |
| yesNo | two radios styled as toggle | boolean | `role=radiogroup`, `sr-only` inputs |
| file | `<UploadZone>` `docType='custom-field:<id>'` | `File[]` in state → descriptor at submit | namespaced docType |
| sectionHeader | `<h3>` (no FieldShell) | — | display-only |
| helpText | `<p>` (no FieldShell) | — | display-only |

Defaults built once at mount via `buildDefaults(schema)` so no input flips uncontrolled→controlled (text→`''`, number→`''`, yesNo→`false`, multiCheckbox→`[]`, select/radio/date→`''`). Render list keyed by `field.id`, never index. `useId()` only for DOM ids, never as the answer key.

### 5c. Validation (pure, derived)

`validateForm(fields, answers) → { [id]: message }` lives in `utils/formSchema.js` (pure, unit-testable, no DOM):

- skip `sectionHeader`/`helpText`;
- `required` + empty → "This field is required." (empty = `null`/`''`/empty array);
- `number`: NaN / `< min` / `> max` → message; empty optional → ok;
- `date`: unparseable → message;
- text: `maxLength` exceeded → message;
- select/radio: value not in `options` → "Choose a valid option." (orphan guard, §8 R3).

Wire into the gate: extend `canAdvance` with `currentKey === 'custom' → Object.keys(liveErrors).length === 0`. **Displayed** errors (`customErrors` state) commit only on a **failed Continue** (no premature red — matches the wizard's non-nagging tone); editing a field clears its error. On failed Continue, focus the first invalid field / error summary (`role="alert"`).

### 5d. File uploads & submit-time merge

`findMissingDocs` (api.js:222-234) matches `documents[].type` against `requiredDocs` (`courseList`/`transcript`/`supporting`). **Fix: namespace `docType:'custom-field:<id>'`** — can never match a literal in `requiredDocs`, no change to `findMissingDocs`.

At submit, append custom files to the existing `docs` build, upload through the **same** `uploadStudentDocuments()`, then **re-link** each file answer to its returned descriptor by matching the namespaced type. The file answer in `form_answers` becomes the descriptor (serializable; has a `url`); the file also remains in `documents[]`.

---

## 6. Counselor builder UI

### 6a. Route / nav

- `router.jsx`: add `{ path: 'forms', element: <FormBuilder /> }` under `/admin` children (already `allow={['admin']}`) + the import.
- `navConfig.jsx`: add `{ to:'/admin/forms', label:'Form Builder', section:'Review', icon:<IconForm/> }` to the `admin` array + one inline `IconForm` SVG. Lights up desktop sidebar, mobile strip, enterprise grouped sidebar — no shell change.

### 6b. Page shape (`FormBuilder.jsx`, master/detail)

```
Header: "Form Builder"                          [Save changes] (dirty-gated, RubricBuilder pattern)
┌ LEFT rail (waiver-type list) ─────────┬ RIGHT pane (selected type editor) ──────────────┐
│ • card/type: active dot, "N fields"   │ Type meta: name · description · active toggle    │
│ • [+ New form] (defaults INACTIVE)    │ Required docs (existing requiredDocs editor)     │
│ • click → loads into right pane       │ Custom fields: [+ Add field] palette · ▲▼ · ✕    │
│ • ✕ → ConfirmDialog → soft-delete     │   └ selected field → FieldConfigPanel            │
└───────────────────────────────────────┤ [Preview] toggle → FieldRenderer (read-only)    │
                                         └──────────────────────────────────────────────────┘
```

Reuses RubricBuilder idioms: `Toggle`, dirty-tracking + `savedMsg`/`error` toast, `actorFromAuth(user, role)` audit actor. New types default **inactive** so students never see a half-built form.

### 6c. Field palette + per-field config

- **Add:** "+ Add field" opens a palette popover (icon+label grid of the 11 types). Picking one appends a field with type-appropriate defaults (default-field factory in `utils/formSchema.js`) and selects it.
- **Reorder:** ▲/▼ icon buttons (disabled at ends), pure array swap. **No drag dep** (YAGNI).
- **Delete field:** per-field ✕ (no confirm — fields hold no external refs; the snapshot shields history).
- **Per-field config matrix** (`FieldConfigPanel.jsx`):

| Prop | Applies to | Control |
|---|---|---|
| `label` | all | text (required, non-empty) |
| `helpText` | all input types | text |
| `required` | all input types | Toggle |
| `options[]` | select / radio / multiCheckbox | options editor (rows of `{value,label}` + ✕, "+ Add option"; `value` auto-slugged from `label` on add, frozen) |
| `min`/`max`/`step` | number | small number inputs |
| `maxLength` | shortText / longText | number input |
| `accept`/`multiple` | file | text + toggle |
| `content` | sectionHeader / helpText | textarea |

Show the frozen `id` as read-only muted text ("field id: `why-substitution`") so counselors understand it's stable; never editable (editing it would orphan stored answers).

### 6d. Schema validation + preview

`validateSchema(fields)` (twin of `validateForm`, in `utils/formSchema.js`) runs on Save: non-empty label per field; unique ids within form; choice fields need ≥1 option with non-empty labels; `number` `min ≤ max`; type-name known; waiver-type name non-empty. On error → block save, surface inline + summary, do not call gateway. Save button disabled while `!dirty`.

**Preview** mounts the same `FieldRenderer` read-only behind a Preview toggle — fidelity by construction.

### 6e. Save

Schema save **is** `updateWaiverType(id, { formSchema })` (D8). Whole-form save persists name/description/active/requiredDocs/formSchema in one `updateWaiverType` call.

### 6f. RubricBuilder change (U5)

RubricBuilder's waiver-type section becomes a **read-only summary** (name, active dot, N-fields) with a **"Manage in Form Builder →"** link. RubricBuilder's `handleSave` no longer writes waivers — it persists only criteria (still demo-only, unchanged). This removes the split-backend Save (M4): `waiver_types` has exactly one writer (`updateWaiverType`).

---

## 7. API gateway changes

All new functions follow the verified dispatch pattern: `if (isSupabaseConfigured) return sb.fn(...)` else demo body → `persist()` → `safeAudit`.

### 7a. New / extended functions

| Function | Mode-both | Backward compat |
|---|---|---|
| `createWaiverType(input, actor)` | NEW — slugified client-gen id (TEXT pk) | n/a |
| `updateWaiverType(id, patch, actor)` | NEW — partial patch (name/description/active/requiredDocs/**formSchema**); this is the schema-save path | untouched keys preserved |
| `deleteWaiverType(id, actor)` | NEW — **soft-delete** (`active=false`); hard-delete not offered (FK NO ACTION) | history preserved |
| `fetchWaiverTypeForm(waiverTypeId)` | NEW — single type's live `formSchema` for intake | `[]` for legacy/missing |
| `fetchAvailableWaivers` / `fetchAllWaivers` | EXTEND mappers — add `formSchema: w.form_schema ?? []` | `[]` for 8 seeds |
| `submitWaiver(payload, actor)` | EXTEND **both paths** — capture `formAnswers`, freeze `formSchemaSnapshot` | omitted → defaults |

### 7b. Demo bodies (api.js) — sketch

```jsx
export async function updateWaiverType(id, patch, actor = null) {
  if (isSupabaseConfigured) return sb.updateWaiverType(id, patch, actor)
  await delay(400)
  const idx = waivers.findIndex(w => w.id === id)
  if (idx < 0) throw new Error(`Unknown waiver type: ${id}`)
  const before = clone(waivers[idx])
  waivers[idx] = { ...waivers[idx], ...patch }     // partial patch
  persist()
  await safeAudit({ action: 'waiver.update', actor: actor ?? DEFAULT_ACTOR, waiverTypeId: id,
    before, after: clone(waivers[idx]), diff: diffWaiverType(before, waivers[idx]) })
  return clone(waivers[idx])
}
// createWaiverType: slugify id, push, persist, audit 'waiver.create'.
// deleteWaiverType: flip active=false, persist, audit 'waiver.delete' (soft).
// fetchWaiverTypeForm: return { waiverTypeId, formSchema: clone(w.formSchema ?? []) }.
```

**M3 fix (demo submit literal):** `submitWaiver`'s explicit queue/submission object literal (api.js:275-295) has no spread — **add `formAnswers` and `formSchemaSnapshot` to that literal**, else they never reach `fetchReviewQueue`/`ReviewDetail` in demo mode. (`fetchReviewQueue` at api.js:345 spreads `...r`, so only the submit literal is the gap.)

### 7c. Supabase impls (supabaseApi.js) — sketch + the parity trap

**The trap (verified):** mappers/`insertRow` are **explicit-column**, not spread — new fields silently vanish unless mapped. Required edits:

```jsx
// rowToWaiverType (extract; both read fns):     + formSchema: w.form_schema ?? []
// rowToSubmission (:29-45):  + formAnswers: r.form_answers ?? {}, + formSchemaSnapshot: r.form_schema_snapshot ?? []
// rowToQueueRow  (:47-68):   + formAnswers / formSchemaSnapshot (so detail view receives them)

export async function updateWaiverType(id, patch) {
  const row = {}
  if ('name'         in patch) row.name          = patch.name
  if ('description'  in patch) row.description   = patch.description
  if ('active'       in patch) row.active        = patch.active
  if ('requiredDocs' in patch) row.required_docs = patch.requiredDocs
  if ('formSchema'   in patch) row.form_schema   = patch.formSchema   // ← schema save
  return rowToWaiverType(unwrap(await supabase.from('waiver_types').update(row).eq('id', id).select('*').single()))
}
// createWaiverType: insert {id, name, description, active, required_docs, form_schema}.
// deleteWaiverType: update {active:false} (soft only — hard DELETE throws FK violation).
// fetchWaiverTypeForm: select id, form_schema where id=… maybeSingle.

// submitWaiver insertRow (extend the EXISTING explicit row at :107-125):
const wt = unwrap(await supabase.from('waiver_types').select('form_schema').eq('id', payload.waiverTypeId).maybeSingle())
//   + form_answers:          payload.formAnswers ?? {},
//   + form_schema_snapshot:  wt?.form_schema ?? [],   // FROZEN copy, not a reference
```

RLS: no new policy (D12). Audit stays **demo-only even in supabase mode** (consistent with current scope) — `safeAudit` calls live in `api.js`, not `supabaseApi.js`; the `actor` arg is signature-parity-only there.

### 7d. submitWaiver in WaiverIntake (in-slice)

Payload gains exactly one key — the AI path is untouched:

```jsx
const res = await submitWaiver({
  ...existingPayload,                 // studentId, waiverTypeId, documents, studentNote,
                                      // courseList, fromCourse, toCourse, transcriptData (UNCHANGED)
  formAnswers: buildFormAnswers(selectedWaiver?.formSchema ?? [], customAnswers, relinkFile),
})
```

`reset()` must also `setCustomAnswers({})` + `setCustomErrors({})`.

---

## 8. Counselor review integration

### 8a. ReviewDetail — render from the **snapshot**

In `SubmissionBlock` (the student-claims left column), after the courseList block, add `<CustomAnswers schema={request.formSchemaSnapshot} answers={request.formAnswers} />`:

```jsx
function CustomAnswers({ schema = [], answers = {} }) {
  const inputs = schema.filter(f => f.type !== 'sectionHeader' && f.type !== 'helpText')
  if (inputs.length === 0) return null                       // legacy/empty → render nothing
  return (/* "Additional information" header, then schema.map:
    sectionHeader → eyebrow <p>; helpText → muted <p>;
    file answer → reuse the documents-as-links <a href={v.url}> pattern (ReviewDetail.jsx:108);
    else → <Field label={f.label}>{formatAnswer(f, v)}</Field>  (reuses existing <Field>) */)
}
// formatAnswer: yesNo → 'Yes'/'No'; multiCheckbox array → join(', '); empty → '—';
//   option value → its option label (looked up in the snapshot field).
```

Renders **only** from `form_schema_snapshot` — labels/order/types as they were at submit, immune to later edits. The "As submitted" raw toggle (`RawSubmission`) gets the same block verbatim-styled.

**M2 fix (double-render):** custom file answers also live in `documents[]` with `docType:'custom-field:*'`. Both `SubmissionBlock` (ReviewDetail.jsx:99-115) and `RawSubmission` (:156-172) `documents.map(...)` and print `doc.type`. **Filter `doc.type?.startsWith('custom-field:')` out of both Documents loops** so custom uploads appear only in the `<CustomAnswers>` block, not twice.

### 8b. ReviewQueue — detail-only, no custom columns

Custom answers do **not** become ag-grid columns: (1) the queue mixes heterogeneous types with disjoint fields — no shared column set; (2) `columnDefs` is a static `useMemo` keyed only on `waiverMap`; per-type dynamic columns break the responsive column-drop logic (`SECONDARY_COLS`); (3) the queue's job is triage by AI recommendation + risk. (Optional future: a single type-agnostic "+N fields" badge in the Waiver cell — not built now.)

---

## 9. Error handling & edge cases

| # | Risk / edge | Mitigation |
|---|---|---|
| R1 | **Custom data leaking into the AI rubric** (highest risk) | Answers live only under `payload.formAnswers`; `evaluateAgainstRubric` is called with an explicitly-built object (api.js:268-273, supabaseApi.js:100-105), never `...payload`. Locked by tests T16/T17. |
| R2 | **Schema drift breaks historical requests** | `form_schema_snapshot` frozen at submit; review renders from it, never live schema. (Mirrors `rule_version`.) T14. |
| R3 | **Orphaned options** (counselor removes a chosen option) | `validateForm` orphan guard at intake; at review, render the raw stored value with an "(option removed)" affordance rather than blank. |
| R4 | **Unknown field type** (older client meets newer schema) | `FIELD_REGISTRY[type]` returns `null` → renders nothing, never throws. `validateSchema` warns at authoring. T12. |
| R5 | **`required:true` on display-only type / type toggled inactive mid-wizard** | Validation skips `sectionHeader`/`helpText`. Re-check `active` at submit; reject inactive with a clear message (mirror existing dedupe/rate-limit rejections). |
| R6 | **File serialization / limits** | `File` isn't JSON-serializable; store only the `{id,name,type,size,url}` descriptor. Enforce `accept`/`multiple` client-side. Files via `uploadStudentDocuments`, not in the JSON column. T15. |
| R7 | **Very long forms (40 fields)** | One additional wizard step (AUGMENT). Validate-on-Continue + error summary + focus-first-error. No per-keystroke validation. |
| R8 | **Concurrent counselor edits** | v1 last-write-wins; stamp `updatedAt` + audit diff so it's traceable. |
| R9 | **Controlled-input uncontrolled flip** | `useState(() => buildDefaults(schema))`; never let a value be `undefined`. T1/T11. |
| R10 | **Demo/Supabase drift** | Explicit mappers both directions + insert column + demo submit literal (M3); T25-T27. Bump `SEED_VERSION`. |
| R11 | **Hard-delete of referenced type** | DB blocks it (FK NO ACTION); `deleteWaiverType` only soft-deletes. |
| R12 | **Stale step state on waiver change** | Clear `customAnswers` + clamp `step` on `selectedWaiverId`/`steps.length` change (§5a). |
| R-m1 | **`rule_version text` latent mismatch** | Existing code inserts an object into a `text` column. Do not copy that — `form_schema_snapshot` is `jsonb`. |
| R-m2 | **Snapshot is client-supplied at INSERT** | Consistent with existing client-trust (`recommendation`/`student_snapshot`/`rule_version` already client-written). Acknowledged; server-side recompute is a future hardening. |
| R-m3 | **`id` immutability is convention, not enforced** | Snapshots make past submissions safe regardless. Show `id` read-only in the builder; document the convention. |

---

## 10. Testing plan (Layer A only — U7)

**Environment reality:** `npm test` = `vitest run`, pure-logic only — no jsdom, no testing-library, no `vitest.config.js`. The field engine's brain lives in `utils/formSchema.js`, so the high-value coverage needs no DOM. Layer-B render tests are **deferred** (would need `@testing-library/react` + jsdom).

### `src/utils/__tests__/formSchema.test.js`
- **buildDefaults:** T1 per-type empty defaults; T2 display-only types produce no key; T3 empty schema → `{}`.
- **validateForm:** T4 required-empty errors / optional-empty ok; T5 satisfied (multiCheckbox ≥1, `yesNo:false` counts as answered); T6 number range/NaN/empty; T7 maxLength; T8 orphan-option guard; T9 display-only skipped even if `required`.
- **validateSchema:** T10 dup ids; T11 choice fields with `options:[]`; T12 unknown type; T13 `makeUniqueId` slug+collision uniqueness across a batch.
- **Snapshot/immutability:** T14 frozen snapshot unaffected by later source-schema change (deep-ref inequality, mirrors `freezeRuleVersion`); T15 `JSON.parse(JSON.stringify(answers))` round-trips every non-file type (catches `File`/`Set`/`undefined` leaks).
- **AI-engine isolation (highest value):** T16 the `studentData` built at submit has **no** `formAnswers` keys; T17 `evaluateAgainstRubric` output is byte-identical with vs without a populated `formAnswers` sibling.

### `src/services/__tests__/customFields.parity.test.js`
- T25 demo (`isSupabaseConfigured=false` via `vi.stubEnv`) round-trips `formAnswers` through submit→fetch; T26 supabase (`vi.mock` the client) maps `formAnswers`/`formSchemaSnapshot` ⇄ snake_case both directions; T27 identical key-sets across both paths for a given payload.

### Backward compat
- T28 a field-less seed type → `buildDefaults` `{}`, step skipped, `canAdvance` unaffected, submit valid; T29 a pre-feature request (no `formAnswers`) reads back null-safe in MyRequests/ReviewDetail.

### Manual QA (gstack-browse, both skins/themes)
Build a form with all 11 types → submit as student → verify in ReviewDetail (snapshot render) → edit/delete a field → confirm old request unchanged. Test `enterprise` (default) + glass skins, light + dark.

---

## 11. File-by-file change list

### Create
| File | Purpose |
|---|---|
| `supabase/migrations/0001b_base_schema.sql` | Backfill: real `CREATE` for profiles/waiver_types/requests + `private.is_counselor()` + RLS policies (reverse-engineered from live project). |
| `supabase/migrations/0002_form_builder.sql` | Add `form_schema` (waiver_types), `form_answers`+`form_schema_snapshot` (requests) + JSONB type-guards. |
| `src/utils/formSchema.js` | Pure engine: `buildDefaults`, `validateForm`, `validateSchema`, `FIELD_REGISTRY`, default-field factory, ported `makeUniqueId`/`slugifyWaiverId`. |
| `src/features/forms/FieldRenderer.jsx` | The 11-type controlled render switch + `FieldShell` a11y scaffold. Editable in wizard, read-only in builder preview. |
| `src/features/admin-review/FormBuilder.jsx` | `/admin/forms` page: master/detail, load via `fetchAllWaivers`, CRUD via gateway, validation + toast, preview. |
| `src/features/admin-review/FieldConfigPanel.jsx` | Per-field config form (§6c matrix + options editor). |
| `src/utils/__tests__/formSchema.test.js` | Layer-A pure tests (T1-T17, T28). |
| `src/services/__tests__/customFields.parity.test.js` | Demo↔Supabase parity tests (T25-T27, T29). |

### Modify
| File | Change |
|---|---|
| `src/features/student-portal/WaiverIntake.jsx` | `steps` useMemo replacing `STEPS`; key-based gating; `customAnswers`/`customErrors` state; conditional custom step mounting `FieldRenderer`; validate-on-Continue; file merge + `formAnswers` in submit payload; `reset()` clears new state. |
| `src/services/api.js` | New demo bodies `createWaiverType`/`updateWaiverType`/`deleteWaiverType`/`fetchWaiverTypeForm`; `submitWaiver` stamps `formSchemaSnapshot` + adds `formAnswers`/`formSchemaSnapshot` to the submit literal (M3); `diffWaiverType` audit helper + `waiver.create/update/delete` actions; **bump `SEED_VERSION` '1'→'2'**. |
| `src/services/supabaseApi.js` | Extract `rowToWaiverType` (+`formSchema`); add `formAnswers`+`formSchemaSnapshot` to `rowToSubmission`/`rowToQueueRow`; new `createWaiverType`/`updateWaiverType`/`deleteWaiverType`/`fetchWaiverTypeForm`; `submitWaiver` insertRow gains `form_answers`+`form_schema_snapshot`. |
| `src/services/mockData.js` | `formSchema: []` on 8 seeds + one populated demo type; (optional) one demo submission with `formAnswers`+snapshot. |
| `src/features/admin-review/RubricBuilder.jsx` | Waiver section → read-only summary + "Manage in Form Builder →" link; `handleSave` persists only criteria; extract `Toggle`→`components/ui/Toggle.jsx`, `makeUniqueId`→`utils/formSchema.js` (shared). |
| `src/features/admin-review/ReviewDetail.jsx` | Add `<CustomAnswers>` sub-block in `SubmissionBlock` (+ raw view), rendering snapshot×answers; filter `custom-field:*` out of both Documents loops (M2). |
| `src/routes/router.jsx` | Import `FormBuilder` + `{ path:'forms', element:<FormBuilder/> }` under `/admin`. |
| `src/components/layout/navConfig.jsx` | `Form Builder` nav entry in the `admin`/`Review` group + `IconForm` SVG. |

---

## 12. Open items deferred to later slices (not v1)

- Real Supabase Storage for file uploads (signed URLs, private bucket + per-student-folder policies). Answer descriptor shape stays stable; only `url` changes.
- Conditional/branching field logic.
- Server-side snapshot recompute / form-version history table (`versionId` join key) for analytics.
- Optimistic-lock reject-on-stale-save for concurrent counselor edits.
- Layer-B component render tests (`@testing-library/react` + jsdom).
- ReviewQueue "+N fields" badge.
