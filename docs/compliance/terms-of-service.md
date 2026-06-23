> DRAFT — requires review by qualified legal counsel before publication or signature. Generated to map to the 1EdTech TrustEd Apps Data Privacy Rubric and the Forsyth County School District Data Sharing Agreement.

# Schedule AI — Terms of Service

**Effective Date:** [EFFECTIVE DATE]

These Terms of Service ("Terms") govern access to and use of the Schedule AI web application ("Service") provided by [COMPANY LEGAL NAME] ("Company," "we," "us") to a subscribing K-12 school district ("District") and to the District's authorized users. By accessing or using the Service, the District and its users agree to these Terms. These Terms operate together with, and are subordinate to, the data sharing and master services agreement between the Company and the District (the "District Agreement"), as further described in Section 11. The Company's Privacy Policy and Breach Response Policy are incorporated into these Terms by reference.

---

## 1. Service Description

Schedule AI is a web application for high schools that allows students to submit course-waiver and schedule-change requests and allows counselors and administrators to review, recommend on, and approve or deny those requests.

The Service includes a deterministic, rule-based scoring engine that evaluates each request against enumerated criteria — GPA thresholds, course prerequisites, seat availability, and schedule conflicts — and produces a recommendation to assist the reviewing counselor. The Service does **not** use generative artificial intelligence and does **not** transmit any data to a third-party large language model. The engine outputs a recommendation only; the final decision on every request is always made by a human counselor. The Service does not profile students for any purpose other than the individual waiver or schedule-change decision, and performs no behavioral or targeted-advertising profiling.

The Service is hosted on managed cloud infrastructure (managed PostgreSQL, authentication, and storage) provided by Supabase, Inc., which operates on Amazon Web Services. The production environment runs in the AWS us-west-1 region (Northern California, United States). All data — both database records and uploaded documents — is stored in the United States. Supabase, Inc. is the sole infrastructure subprocessor. No other third party receives student data.

The Company is working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA for the Service.

## 2. Eligibility

Access to the Service is provisioned by the District. The Service is provided solely for use by the District's authorized students, counselors, and administrators in connection with the District's educational operations.

The Service is scoped to students in grades 9 through 12. It is not directed to, and is not intended for, children under the age of 13. Authentication is restricted to the District's Google Workspace email domain ([GOVERNING DISTRICT DOMAIN]); individuals without a valid District-provisioned account in that domain are not eligible to use the Service.

## 3. Account and Authentication

Access to the Service is available **only** through Google Workspace single sign-on, restricted to the District's email domain ([GOVERNING DISTRICT DOMAIN]). The Company does not create, collect, or store passwords for any user. Multi-factor authentication is enforced upstream by the District's Google Workspace identity provider; the Company relies on the District's identity provider for credential verification.

Users are responsible for maintaining the confidentiality of their District-provisioned credentials and for all activity occurring under their account. Suspected unauthorized account use must be reported promptly to the District and to [SUPPORT CONTACT].

## 4. Roles and Provisioning (No Self-Elevation)

The Service uses a role model in which user roles are **not** self-selected:

- New accounts default to the **student** role.
- Staff roles (counselor / administrator) are granted only by an existing counselor; users cannot elevate their own role.
- Role assignment, and the elevation of any account to staff status, is controlled by the District through the Service.

Privilege escalation is blocked at the database layer. Students cannot change their own role, GPA, or grade level. Row-Level Security policies enforce that students may access only their own records and that counselors may access only the records within their assigned scope. Access to student records is audit-logged, recording who viewed or changed each record, consistent with FERPA disclosure-logging obligations (34 C.F.R. § 99.32).

## 5. Acceptable Use

Users agree to use the Service only for its intended educational purpose and in compliance with applicable District policy and law. Users shall not:

- attempt to access, view, alter, or delete records they are not authorized to access, or attempt to defeat Row-Level Security, audit logging, or role controls;
- attempt to elevate their own role or another user's role outside the counselor-provisioned process described in Section 4;
- submit false, misleading, or another person's information, or upload documents the user is not authorized to share;
- upload content that is unlawful, or that contains data elements the District has classified as Prohibited or Restricted (see Section 7) where such elements are outside the data the Service is designed to collect;
- introduce malware, attempt to disrupt or overload the Service, reverse engineer it except as permitted by law, or use automated means to access it outside its intended interfaces;
- use the Service, or any data within it, for advertising, marketing, resale, or any commercial purpose.

The District may suspend or revoke any user's access for violation of this Section.

## 6. Intellectual Property

As between the parties, the Company retains all right, title, and interest in and to the Service itself, including the application software, the deterministic rule-based scoring engine, the user interface, and all related documentation and improvements to them, excluding District Data (defined in Section 7).

Subject to these Terms and the District Agreement, the Company grants the District a limited, non-exclusive, non-transferable right to access and use the Service during the term for the District's internal educational purposes.

The Company is granted **no** license to use District Data to develop, train, or improve any product or service. Nothing in these Terms grants the Company any ownership of, or any right to use, District Data except solely as necessary to provide the Service to the District. The Company does not derive any rights in District Data from the District's use of the Service.

## 7. Ownership and Use of District and Student Data

**District Ownership.** All District data and student education records processed through the Service ("District Data") are and remain the sole property of the District. The Company claims no ownership of District Data. In providing the Service, the Company acts as a "school official" with a legitimate educational interest, under the direct control of the District, within the meaning of FERPA (34 C.F.R. § 99.31(a)(1)).

**Permitted Use.** The Company uses District Data **solely** to provide the Service to the District. District Data is never sold, rented, or used for advertising, marketing, product development, or any other commercial purpose. The Service contains no advertising of any kind and uses no advertising networks, web beacons, behavioral or targeted advertising, or third-party advertising trackers.

**Data Collected.** The Service collects only the following data elements: full name, school email address, grade level, GPA, the content of course-waiver and schedule-change requests (current and desired courses and any student note), uploaded transcript documents, answers to counselor-defined intake form fields, and audit-log entries recording who viewed or changed records.

**Data Not Collected.** The Service does not collect Social Security numbers, personal (non-school) email addresses, free/reduced-lunch or economic-status information, race or ethnicity, gender, date of birth, home address, special-education status, or parent contact information. These correspond to the data elements the District classifies as Prohibited and Restricted.

**Security.** District Data is encrypted in transit (TLS/HTTPS) and at rest (AES-256), as provided by the underlying Supabase/AWS infrastructure. Uploaded documents are stored in a private storage bucket and are served only through short-lived signed URLs. Access to student records is audit-logged.

**Retention.** The Company retains District Data only for as long as necessary to provide the Service to the District, and otherwise handles deletion, return, and destruction of District Data as set out in this Section and in Section 10. District Data is not retained for any purpose beyond providing the Service.

**Data Rights and Lifecycle.** Students and parents may request a copy (export) of the student's data and may request its deletion. Upon a verified parental request, deletion is completed within 10 days. The Company maintains a written breach-response policy and will notify the District in writing without undue delay, and in any event within 72 hours of confirming a security incident affecting student data.

The Company's processing of District Data is governed by FERPA; the Georgia Student Data Privacy provisions and Student Data Sharing requirements (O.C.G.A. § 20-2-660 et seq. and § 20-2-666 et seq.); the Protection of Pupil Rights Amendment (PPRA); applicable SOPIPA-equivalent obligations; and COPPA (addressed by the Service's grades 9–12 scoping). On any conflict between these Terms and the District Agreement regarding District Data, the District Agreement governs (see Section 11).

## 8. Disclaimers

Except as expressly stated in the District Agreement, the Service is provided "as is" and "as available," and the Company disclaims all other warranties to the maximum extent permitted by law, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. The deterministic scoring engine produces recommendations only; it does not make decisions, and the Company does not warrant any particular outcome of a counselor's review. The District remains responsible for the educational decisions made by its counselors and administrators.

This Section is subject to, and does not limit, any warranties or commitments the Company has made to the District in the District Agreement, which govern on conflict (see Section 11).

## 9. Limitation of Liability

To the maximum extent permitted by applicable law, and except for the Company's obligations regarding the security, confidentiality, return, and destruction of District Data, neither party will be liable for indirect, incidental, special, consequential, or punitive damages arising out of or relating to the Service.

The Company does **not** require the District to indemnify, defend, or hold the Company harmless, and nothing in these Terms imposes any indemnification obligation on the District. To the extent the District Agreement addresses liability, indemnification, or limitations thereon, the District Agreement governs and controls over this Section on any conflict (see Section 11).

## 10. Termination, Data Return, and Destruction

Either party may terminate access to the Service as provided in the District Agreement.

Upon termination of the District Agreement, the Company will:

1. return all District Data to the District within **10 business days** of termination;
2. destroy all education records in its possession or control within **45 days** of termination; and
3. provide the District written confirmation of such destruction no later than **50 days** after termination.

Termination does not relieve the Company of its obligations to protect, return, and destroy District Data, which survive termination.

## 11. Governing Law; Relationship to the District Agreement

These Terms are governed by the laws of the State of Georgia, without regard to its conflict-of-laws principles.

These Terms do not impose mandatory or binding arbitration on the District, and no provision of these Terms shall be read to require the District to arbitrate any dispute.

These Terms are subordinate to the District Agreement. **In the event of any conflict or inconsistency between these Terms and the District Agreement, the terms of the District Agreement govern and control.** No provision of these Terms limits, waives, or supersedes any protection, right, or remedy afforded to the District under the District Agreement.

## 12. Modifications

The Company may update these Terms from time to time. The Company will provide the District with reasonable advance notice of any material change. No modification to these Terms is effective against the District to the extent it conflicts with the District Agreement, and material changes affecting District Data or the District's rights require the District's agreement as provided in the District Agreement. Continued use of the Service after the effective date of a non-conflicting update constitutes acceptance of the updated Terms.

## 13. Contact

- **Privacy inquiries and data-rights requests:** [PRIVACY CONTACT EMAIL]
- **Support:** [SUPPORT CONTACT]
- **Company:** [COMPANY LEGAL NAME], [COMPANY ADDRESS]

---
**Used:** advisor (pressure-test, 2x). Considered: gstack-cso (rejected — infra audit, not doc compliance), llm-council (rejected — single-correct-answer edit), humanizer (rejected — not AI-prose). Direct exec chosen. Verified all DSA numbers (10d/10bd/45d/50d/72h), §99.31/99.32, O.C.G.A. cites — all clean, no planted swap. One substantive change: added **Retention** paragraph in Section 7 (purpose-limitation, tied to Sections 7+10, no invented period — closes the rubric retention gap truthfully). Cookies left unfabricated (facts silent; existing no-tracker language covers it). No overclaims found or introduced; placeholders + banner intact.
