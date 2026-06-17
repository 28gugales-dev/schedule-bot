# SYSTEM: PROJECT INITIATION & AGENT PROTOCOLS
This document defines the architecture, constraints, and autonomous execution strategy for a high school course scheduling and waiver platform. 

## 1. Agent Autonomy & Fable 5 Directives
*   **Goal-Oriented Execution:** You are acting autonomously. Plan across stages, utilize your tools to verify your outputs, and do not wait for granular, step-by-step human instructions. Lead with the outcome and verify against the success criteria.
*   **External Memory:** Create and maintain a `PLANNING_SCRATCHPAD.md` file to persist your plan, architectural decisions, and task statuses. Read and update this file at the start and end of every task to prevent context degradation over long runs.
*   **Self-Verification & Checkpoints:** After building a feature, run a self-verification check. Does the UI match the criteria? Are the API boundaries cleanly stubbed? Do not present unverified work. Establish a method for checking your own work as you build.
*   **The PR is the Unit of Work:** Ship small, reviewable chunks. One file equals one responsibility. Keep files under 300 lines; extract complex logic into hooks or sub-components.

## 2. Resource Mining & Code Reuse (CRITICAL)
Before writing new boilerplate from scratch, you must act as a resource investigator:
*   **Local Repository Scanning (Graphify):** Use Graphify (or your codebase indexing tools) to scan my local repositories and workspace. Look specifically for existing React components, UI shells, authentication flows, or PDF parsing utilities that can be reused or adapted for this frontend.
*   **Open-Source Discovery:** Actively search for and utilize high-quality open-source libraries or code snippets that solve complex parts of this app (e.g., drag-and-drop file uploaders, PDF text extraction for the transcript parsing stubs, or Kanban-style queue UIs). Do not reinvent the wheel if a lightweight, secure open-source solution exists.

## 3. Architecture & Tech Stack
*   **Stack:** React 19, Supabase (Auth, DB, Storage), Tailwind CSS, React Router v7.
*   **Structure:** Use a Feature-first directory design (e.g., `/features/student-portal`, `/features/admin-review`).
*   **Boundary Rule:** **DO NOT** write the core algorithmic logic for transcript parsing or schedule cross-checking. Scaffold the UI, the state management, and the API service calls. Leave clean, highly documented placeholder functions where the algorithm will eventually be injected.

## 4. Core Deliverables & Features

### A. Student Portal (Frictionless Intake)
A guided, step-by-step experience for students to submit and track requests.
*   **Authentication:** Google SSO integration via Supabase.
*   **Onboarding & Uploads:** A drag-and-drop UI for students to upload their Transcript (PDF), Current Course List, and Supporting Documents.
*   **Waiver Form Selection:** A grid/list of currently active waiver types (e.g., "AP Course Override", "Standard Schedule Change") dynamically fetched from the Admin configuration.
*   **Submission & Tracking:** Upon submission, trigger a stubbed API call for a Confirmation Email. Include a visual progress stepper (`Submitted` -> `Automated Review` -> `Counselor Review` -> `Decision`).

### B. Admin / Counselor Portal (Rapid Review Command Center)
A configuration and rapid-review command center.
*   **Rubric & Criteria Builder (Configuration):** A settings view where admins can define the rules for specific waivers (e.g., "Must have >85 in prerequisite") and toggle specific waiver forms 'Active' or 'Inactive'.
*   **The 1-by-1 Queue (Focused Review Mode):** A distraction-free interface presenting pending waivers one at a time. It must feature a **Unified Information Panel** displaying the student's transcript, course list, counselor notes, and the algorithm's recommendation on a single screen without scrolling or tabs.
*   **Rapid Action Row:** Giant "Admit" and "Deny" buttons. Clicking either instantly logs the decision and slides the next student's card into view.
*   **Batch Sync Dashboard:** A view showing the queue of "Approved" waivers waiting for the next automated push to Infinite Campus, complete with a countdown timer to the next sync and a "Force Sync Now" button.

## 5. API Service Scaffolding
Create a dedicated API service layer (`services/api.js`). Scaffold asynchronous functions to handle data flow, mocking the backend where necessary:

**Storage & Intake:**
*   `uploadStudentDocuments(userId, files)`
*   `fetchAvailableWaivers()`
*   `submitWaiver(userId, waiverData)`

**Admin & Review:**
*   `fetchReviewQueue()`
*   `submitDecision(waiverId, decision)`
*   `updateRubricCriteria(waiverTypeId, criteriaConfig)`

**Infinite Campus Batch Sync:**
*   `triggerBatchICPush()` (Mocks a POST request sending approved waivers to the IC API).

**Algorithm Stubs (`utils/schedulingLogic.js`):**
Create empty/mocked functions for external algorithms:
*   `parseTranscriptData(fileUrl)`
*   `evaluateAgainstRubric(studentData, criteria)`

## 6. Execution Order ("Harness Day" First)
1.  Initialize the project environment (React 19, Tailwind, React Router).
2.  Create `PLANNING_SCRATCHPAD.md` and map out your file structure.
3.  **Scan Local Repos:** Use Graphify/local search tools to find reusable UI components and setup files.
4.  Build the static layout skeleton and authentication boundaries (Student vs. Admin routes).
5.  Scaffold the API service layer and algorithm stubs.
6.  Build the Admin Portal components (Rubric Builder -> 1-by-1 Queue).
7.  Build the Student Portal components (Uploads -> Form -> Tracker).
8.  Run a final self-verification against this document's requirements.