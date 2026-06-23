> DRAFT — requires review by qualified legal counsel before publication or signature. Generated to map to the 1EdTech TrustEd Apps Data Privacy Rubric and the Forsyth County School District Data Sharing Agreement.

# Breach Response Policy

**Product:** Schedule AI (internal repository: schedule-bot)
**Policy owner:** [COMPANY LEGAL NAME]
**Privacy contact:** [PRIVACY CONTACT EMAIL]
**Support contact:** [SUPPORT CONTACT]
**Registered address:** [COMPANY ADDRESS]
**Effective date:** [EFFECTIVE DATE]

---

## 1. Purpose and Scope

This Breach Response Policy is the written breach-response procedure that [COMPANY LEGAL NAME] ("the Company," "we," "us") maintains for the Schedule AI service ("the Service"). It serves two functions:

1. an **internal operating procedure** that governs how the Company detects, classifies, contains, remediates, and reviews security incidents affecting student data; and
2. an **external commitment** to the school district ("the District") that the Company will notify the District of any confirmed security incident affecting student data in writing, without undue delay, and in any event within 72 hours of confirmation.

This Policy applies to all student data the Company processes as a "school official" under FERPA, acting under the direct control of the District. The data within scope is the exhaustive set the Service collects: full name, school email address, grade level, GPA, the content of course-waiver / schedule-change requests (current and desired courses and the student note), uploaded transcript documents, answers to counselor-defined intake form fields, and the audit logs recording who viewed or changed records.

This Policy aligns to the breach-notification obligations of the Forsyth County School District Data Sharing Agreement ("the DSA"). Where this Policy and the DSA conflict, the DSA controls. Nothing in this Policy reduces any obligation the Company owes under the DSA, FERPA, the Georgia Student Data Privacy Act and Student Data Privacy provisions (O.C.G.A. § 20-2-660 et seq. and § 20-2-666 et seq.), PPRA, SOPIPA-equivalent obligations, or COPPA (the Service is scoped to grades 9–12, with no users under 13).

The Service runs on Supabase (managed PostgreSQL, Auth, and Storage), in the AWS region us-west-1 (Northern California, USA). All data — database rows and uploaded documents — is stored in the United States. The sole infrastructure subprocessor is Supabase, Inc. (which operates on Amazon Web Services). No other third party receives student data. Accordingly, this Policy covers incidents originating at the Company and incidents at the Supabase subprocessor.

---

## 2. Definitions

**Student data.** Any of the data elements listed in Section 1 that relate to an identifiable student, together with any education record the Company holds on behalf of the District.

**Security incident.** Any actual or reasonably suspected event that compromises, or threatens to compromise, the confidentiality, integrity, or availability of student data or of the systems that store or process it. Examples include unauthorized access to the database or storage bucket, compromise of administrative credentials, exploitation of a Row-Level Security or privilege-escalation control, malware on a system with access to student data, loss or theft of a device or credential with access to student data, or a confirmed compromise at the Supabase subprocessor affecting the Service.

**Data breach.** A security incident that is confirmed to have resulted in, or for which the Company cannot reasonably rule out, the unauthorized access to, acquisition of, disclosure of, alteration of, loss of, or destruction of student data. Every data breach is a security incident; not every security incident is a data breach.

**Confirmation.** The point at which the Incident Response Lead (Section 9) determines, on the available evidence, that a security incident affecting student data has in fact occurred (i.e., that it is a data breach or cannot be ruled out as one). The 72-hour notification clock in Section 5 runs from confirmation, not from first detection or first suspicion.

---

## 3. Detection and Reporting Channels

### 3.1 How incidents are detected

The Company detects potential security incidents through:

- **Audit logging.** All access to and changes of student records are audit-logged, consistent with FERPA § 99.32 disclosure logging. Audit logs record who viewed or changed records and are available for review when an incident is suspected.
- **Platform and infrastructure signals.** Logs, alerts, and security advisories from Supabase / AWS, and sign-in events from the District's Google Workspace identity provider (the sole sign-in path; see Section 8).
- **Control-failure signals.** Indications that a Row-Level Security policy, signed-URL expiry, or privilege-escalation block has failed or been bypassed.
- **External reports.** Reports from the District, students, parents, security researchers, or the Supabase subprocessor.

### 3.2 How to report a suspected incident

Anyone — staff, District personnel, a student or parent, or an external researcher — may report a suspected security incident to the Company's privacy contact at **[PRIVACY CONTACT EMAIL]**, or via **[SUPPORT CONTACT]**. Reports should include, to the extent known: what was observed, when, the systems or records involved, and the reporter's contact details. All reports are triaged on receipt under Section 4. Company personnel who become aware of a suspected incident must report it internally without delay; suppressing or delaying a report is prohibited.

---

## 4. Severity Classification

On receipt, each suspected incident is triaged and assigned a severity level by the Incident Response Lead. Severity drives the urgency of containment and the breadth of internal escalation; it does **not** alter the external notification commitment in Section 5, which applies to any confirmed incident affecting student data regardless of assigned severity.

| Level | Label | Description | Examples |
|------|-------|-------------|----------|
| **SEV-1** | Critical | Confirmed or highly likely unauthorized access to, acquisition of, or loss of student data; or loss of integrity/availability of student data. | Exfiltration of database rows or transcript documents; compromise of a counselor/admin account; bypass of Row-Level Security exposing other students' records. |
| **SEV-2** | High | Credible threat to student data not yet confirmed as access/acquisition, or a material control failure with potential exposure. | A privilege-escalation attempt blocked at the database layer but indicating active targeting; a signed-URL or bucket misconfiguration with possible, unconfirmed exposure. |
| **SEV-3** | Moderate | Security-relevant event with low likelihood of student-data exposure. | Failed intrusion attempts with no access obtained; a vulnerability in a non-data-path component. |
| **SEV-4** | Low / informational | Security hygiene findings with no exposure of student data. | A Supabase advisor warning on a non-production resource; a policy near-miss caught before any access. |

Any incident classified SEV-1 or SEV-2 is treated as affecting student data for notification purposes unless and until the investigation affirmatively rules that out. When severity is uncertain, the Company classifies upward.

---

## 5. Notification Commitment to the District

**Core commitment.** Upon confirming a security incident that affects, or that the Company cannot reasonably rule out as affecting, student data, the Company will notify the District **in writing, without undue delay, and in any event within 72 hours of confirmation.** This is the Company's binding external commitment under the breach-notification obligations of the DSA.

- **Trigger.** The clock starts at *confirmation* as defined in Section 2. Triage, containment, and investigation begin immediately on detection and do not wait for the clock.
- **Form.** Notice is delivered in writing to the District's designated contact(s) under the DSA, using the contact channel the District has specified for breach notices.
- **No delay for completeness.** The Company will not delay notification to complete its investigation. An initial notice is sent within the 72-hour window with the information then available, expressly marked preliminary, and is supplemented as facts develop (Section 6).
- **No delay for remediation.** Notification is not contingent on containment or remediation being finished.
- **Subprocessor incidents.** A confirmed incident at the Supabase subprocessor affecting the Service is the Company's incident for the purposes of this commitment; the Company notifies the District on the same 72-hour basis and does not shift that duty to the subprocessor.
- **Coordination of public statements.** The Company will coordinate with the District on the timing and content of any external or public statement concerning the incident and will not make a public statement identifying the District without consulting the District, except where independently required by law.

This commitment is a floor. Where the DSA, Georgia law (including O.C.G.A. § 20-2-660 et seq. and § 20-2-666 et seq.), or other applicable law requires faster or additional notification, that requirement governs.

---

## 6. Required Contents of a Breach Notice

The written notice to the District will include the following, to the extent known at the time of sending, and will be supplemented as the investigation progresses:

1. **Summary** — a description of the security incident and its current status (preliminary or updated).
2. **Date and time** — when the incident occurred (or the estimated window), when it was detected, and when it was confirmed.
3. **Discovery** — how the incident was detected and confirmed.
4. **Scope of data** — the categories of student data involved, drawn from the exhaustive list in Section 1 (e.g., names, school email addresses, grade level, GPA, request content, transcript documents, intake-form answers, audit-log entries).
5. **Affected individuals** — the number and, where known, the identities or class of students whose data was or may have been involved.
6. **Cause** — the known or suspected cause and the vulnerability or failure exploited, including whether the Supabase subprocessor was involved.
7. **Containment and remediation** — the steps already taken to contain the incident and those planned or in progress (cross-reference Sections 7 and 8).
8. **Risk assessment** — the Company's assessment of the risk of harm to affected students.
9. **Recommended actions** — any steps the Company recommends the District take.
10. **Point of contact** — the name and contact details of the Company's Incident Response Lead and privacy contact (**[PRIVACY CONTACT EMAIL]**) for the District's follow-up.
11. **Regulatory note** — identification of any legal-notification obligations the Company believes may be triggered, for the parties to coordinate on.

The Company will also provide any further information reasonably requested by the District to enable the District to meet its own obligations to students, parents, and regulators.

---

## 7. Containment and Remediation

### 7.1 Containment

On detection of a credible incident, and before the investigation is complete, the Company acts immediately to contain it. Containment measures, selected to fit the incident, may include: revoking or rotating compromised credentials and API keys; invalidating active sessions and outstanding signed URLs for the private document bucket; tightening or restoring Row-Level Security policies; isolating affected components; coordinating with the Supabase subprocessor to halt ongoing access; and preserving logs and forensic evidence so the root cause can be established and so evidence is not destroyed during containment.

### 7.2 Remediation

After containment, the Company remediates the root cause. Remediation may include patching the vulnerability or misconfiguration; correcting or restoring affected data; strengthening access controls, RLS policies, and privilege-escalation protections; and verifying that encryption in transit (TLS/HTTPS) and at rest (AES-256) and other controls in Section 8 are intact and effective.

---

## 8. Relevant Security Controls

The following controls reduce the likelihood and limit the impact of a breach, and form the baseline the Company restores and verifies during remediation:

- **Encryption.** In transit via TLS/HTTPS and at rest via AES-256, both provided by Supabase / AWS.
- **Authentication.** Google Workspace single sign-on only, restricted to the District's email domain ([GOVERNING DISTRICT DOMAIN]). The app creates and stores no passwords. Multi-factor authentication is enforced upstream by the District's Google Workspace identity provider.
- **Authorization.** Row-Level Security ensures students access only their own records and counselors access only their assigned scope. Roles are not self-selected; new accounts default to "student," and staff are elevated only by an existing counselor. Privilege escalation is blocked at the database layer — students cannot change their own role, GPA, or grade.
- **Document protection.** Uploaded documents live in a private bucket and are served only via short-lived signed URLs.
- **Audit logging.** Access to student records is audit-logged (FERPA § 99.32 disclosure logging), supporting both detection and post-incident reconstruction.
- **Data minimization.** The Service does not collect Social Security numbers, personal (non-school) email, free/reduced-lunch or economic status, race/ethnicity, gender, date of birth, home address, special-education status, or parent contact information — the Forsyth County "Prohibited" and "Restricted" elements — which limits the sensitivity of any data that could be exposed.

---

## 9. Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **Incident Response Lead** | Owns the response end to end: confirms incidents, assigns severity, directs containment and remediation, decides when the 72-hour clock starts, and approves District notices. The privacy contact ([PRIVACY CONTACT EMAIL]) holds or assigns this role. |
| **Privacy / District Liaison** | Drafts and delivers the written notice to the District within the 72-hour window, serves as the District's point of contact ([PRIVACY CONTACT EMAIL]), and coordinates supplements and follow-up requests. |
| **Engineering / Technical Responder** | Executes technical containment and remediation (credential rotation, session and signed-URL invalidation, RLS and bucket fixes, patching), preserves logs and evidence, and coordinates with the Supabase subprocessor. |
| **Support Intake** | Receives external reports via [SUPPORT CONTACT], routes them immediately to the Incident Response Lead, and relays status to reporters as authorized. |
| **Executive Sponsor** | Approves external communications and is accountable for compliance with this Policy and the breach-notification obligations of the DSA. |

A single individual may hold more than one role, provided the notification commitment in Section 5 is met. Roles and contacts are reviewed at least annually and after any SEV-1 or SEV-2 incident.

---

## 10. Post-Incident Review

Within a reasonable period after an incident is closed — and in any case after every SEV-1 and SEV-2 incident — the Incident Response Lead conducts a post-incident review documenting:

1. the timeline from detection to confirmation to notification to closure, including whether the 72-hour commitment was met;
2. the confirmed root cause;
3. the effectiveness of containment and remediation;
4. corrective and preventive actions, with owners and target dates, to reduce the likelihood and impact of recurrence; and
5. any required updates to this Policy, to the security controls in Section 8, or to roles in Section 9.

The Company retains post-incident review records consistent with the DSA and applicable law and makes them available to the District on reasonable request. Lessons learned are fed back into the controls and procedures above.

---

## 11. Review and Maintenance of this Policy

This Policy is reviewed at least annually, after any SEV-1 or SEV-2 incident, and upon any material change to the Service, its data flows, or its subprocessor. Material changes are communicated to the District as required by the DSA.

---

*This document is intended to map to the 1EdTech TrustEd Apps Data Privacy Rubric and to align with the breach-notification obligations of the Forsyth County School District Data Sharing Agreement. It is a draft and must be reviewed by qualified legal counsel before publication or signature.*
