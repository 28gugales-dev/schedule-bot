> DRAFT — requires review by qualified legal counsel before publication or signature. Generated to map to the 1EdTech TrustEd Apps Data Privacy Rubric and the Forsyth County School District Data Sharing Agreement.

# Forsyth County Schools — Digital Application Review
## Answer Sheet: Schedule AI

**Vendor / Product:** [COMPANY LEGAL NAME] — "Schedule AI"
**Product description:** A web-based application for K-12 high schools (grades 9-12) where students submit course-waiver and schedule-change requests and counselors review, recommend on, and approve them.

---

## Section 1 — Application Summary

| Field | Answer |
|---|---|
| **Product name** | Schedule AI |
| **Company / legal entity** | [COMPANY LEGAL NAME] |
| **Company address** | [COMPANY ADDRESS] |
| **Privacy contact** | [PRIVACY CONTACT EMAIL] |
| **Support contact** | [SUPPORT CONTACT] |
| **Effective date** | [EFFECTIVE DATE] |
| **What it does** | Students submit course-waiver / schedule-change requests; counselors review and approve. A deterministic rule-based engine produces a recommendation that assists — but never replaces — the counselor's decision. |
| **Intended users / grade band** | Grades 9-12 only. The product is provisioned to enrolled high-school students through the district; this enrollment-based scoping is the basis for the product's posture outside COPPA's child-directed scope. |
| **Who creates accounts** | District staff and students within the district's Google Workspace domain. Roles are not self-selected: new accounts default to "student"; staff are elevated to counselor/admin by an existing counselor. |
| **TrustEd Apps / 1EdTech membership** | [PLACEHOLDER: 1EdTech TrustEd Apps membership / certification status] |

---

## Section 2 — Technology Requirements

| Field | Answer |
|---|---|
| **Resource type** | Website / Cloud-based application. |
| **Hosting model** | Managed cloud (Supabase: managed PostgreSQL + Auth + Storage), running on Amazon Web Services. |
| **Single Sign-On (SSO)** | Yes — Google Workspace SSO **only**, restricted to the district's email domain ([GOVERNING DISTRICT DOMAIN]). No passwords are created or stored by the application. |
| **Multi-factor authentication (MFA)** | Enforced **upstream** by the district's Google Workspace identity provider. The app does not manage credentials and therefore inherits the district's MFA posture. |
| **Does the product use Artificial Intelligence in any form to assess data?** | **Yes — but with important qualifications.** A deterministic, rule-based scoring engine performs an automated assessment over enumerated criteria (GPA thresholds, prerequisites, seat availability, schedule conflicts) to **assist** counselors. It outputs a recommendation only; the final decision is **always** made by a human counselor. There is **no generative AI** and **no third-party large language model**. There is **no profiling** of students for any purpose beyond the individual waiver decision — no behavioral or targeted-advertising profile is built (consistent with SOPIPA). |
| **Data residency** | United States. Production runs in AWS region **us-west-1** (Northern California, USA). All data — database rows **and** uploaded documents — is stored in the United States. |
| **Encryption in transit** | Yes — TLS / HTTPS (provided by Supabase / AWS). |
| **Encryption at rest** | Yes — AES-256 (provided by Supabase / AWS). |
| **Cookies / tracking** | No advertising, analytics, or behavioral-tracking cookies; no web beacons or third-party ad trackers. Authentication is handled through Google Workspace SSO. |
| **Documented breach-response policy** | Yes — the company maintains a written breach-response policy and notifies the district in writing without undue delay and in any event within **72 hours** of confirming a security incident affecting student data. |
| **Subprocessors** | Sole infrastructure subprocessor: **Supabase, Inc.** (which runs on Amazon Web Services). No other third parties receive student data. Any change of subprocessor is preceded by at least 30 days' advance written notice to the district. |
| **Accessibility** | Working toward WCAG 2.1 Level AA conformance. [PLACEHOLDER: current accessibility status / conformance report] |
| **Do Not Track / GPC** | The product performs no cross-site tracking and uses no advertising or analytics cookies, so there is no tracking activity for a "Do Not Track" or Global Privacy Control signal to limit. |

### Security controls (detail)

- **Row-Level Security (RLS):** database-enforced policies ensure students access only their own records and counselors access only their assigned scope.
- **Privilege-escalation protection:** blocked at the database layer — students cannot change their own role, GPA, or grade.
- **Document storage:** uploaded documents live in a private bucket and are served only via short-lived signed URLs.
- **Audit logging:** access to student records is audit-logged (who viewed or changed records), supporting the district's FERPA §99.32 disclosure accounting.

---

## Section 3 — Rostering / Integrations

| Field | Answer |
|---|---|
| **User provisioning** | Via Google Workspace SSO, domain-restricted to [GOVERNING DISTRICT DOMAIN]. Accounts are created on first authenticated sign-in; roles default to "student" and are elevated by an existing counselor. |
| **Clever integration** | Not implemented. |
| **ClassLink integration** | Not implemented. |
| **OneRoster (IMS Global / 1EdTech) integration** | Not implemented. |
| **Automated SIS roster sync** | Not available today. Provisioning is handled exclusively through domain-restricted Google SSO; there is no automated roster import from Clever, ClassLink, or OneRoster at this time. |

> Honest disclosure: Schedule AI does **not** currently support automated rostering via Clever, ClassLink, or OneRoster. The only provisioning path is Google Workspace SSO restricted to the district domain.

---

## Section 4 — Data Collected

### Data the product DOES collect (exhaustive)

- Full name
- School email address
- Grade level
- GPA
- Content of course-waiver / schedule requests (current courses, desired courses, student note)
- Uploaded transcript documents
- Answers to counselor-defined intake form fields
- Audit-log entries (who viewed or changed records)

### Data ownership

All education records and student data processed by the product remain the property of the district (and of students/parents under FERPA). The company acts solely as a "school official" processing data on the district's behalf and under its direct control; the company asserts **no ownership** of student data and acquires no independent rights to it.

### Data retention (in-life)

Data is retained only for the duration of the district agreement and only to provide the service to the district. On termination, data is returned and destroyed under the lifecycle terms in Section 6.

### Data the product does NOT collect

The following correspond to the Forsyth County "Prohibited" and "Restricted" data elements and are **not** collected:

- Social Security numbers
- Personal (non-school) email
- Free/reduced-lunch or economic status
- Race / ethnicity
- Gender
- Date of birth
- Home address
- Special-education status
- Parent contact information

---

## Section 5 — Advertising & Monetization

| Field | Answer |
|---|---|
| **Advertising of any kind** | None. No advertising networks, web beacons, behavioral or targeted advertising, or third-party ad trackers. |
| **Sale or rental of student data** | Never. Student data is never sold or rented. |
| **Use for marketing / product development / other commercial purpose** | None. Data is used solely to provide the service to the district. |
| **Targeted-advertising profile** | None built. (Consistent with SOPIPA.) |

---

## Section 6 — Data Sharing Agreement Posture

| Field | Answer |
|---|---|
| **Data stored in the United States** | Yes — exclusively. AWS us-west-1; database rows and uploaded documents both in the U.S. |
| **Foreign transmission / storage of student data** | None. No student data is transmitted or stored outside the United States. |
| **Sale of student data** | No. |
| **FERPA role** | The company acts as a **"school official"** with a legitimate educational interest, under the **direct control** of the district (FERPA 34 CFR §99.31(a)(1)). |
| **Use limitation** | Data is used solely to provide the service to the district — never for advertising, marketing, product development, or any other commercial purpose. |
| **Third-party sharing / opt-out** | There is no sale of, and no third-party sharing of, student data — so there is nothing to opt out of. The sole subprocessor (Supabase, Inc.) is essential hosting infrastructure and receives data only to operate the service. |
| **Data ownership** | All education records remain the property of the district / students / parents; the company holds no ownership interest (see Section 4). |
| **Data-subject rights (export)** | Students/parents may request a copy (export) of their data. |
| **Data-subject rights (deletion)** | Students/parents may request deletion; deletion is completed within **10 days** of a verified parental request. |
| **Data return on termination** | On termination of the district agreement, the company returns all district data within **10 business days**. |
| **Data destruction on termination** | The company destroys all education records within **45 days** of termination and provides written confirmation no later than **50 days** after termination. |
| **Breach notification** | Written notice to the district without undue delay, and in any event within **72 hours** of confirming a security incident affecting student data. |
| **Executed Data Sharing Agreement** | [PLACEHOLDER: signed Forsyth County Data Sharing Agreement — pending legal counsel review and authorized signature] |

---

## Section 7 — Compliance Frameworks

| Framework | Posture |
|---|---|
| **FERPA** | Company acts as a "school official" under direct district control; access to student records is audit-logged to support the district's §99.32 disclosure accounting. |
| **SOPIPA-equivalent obligations** | No targeted advertising, no sale of data, no profiling beyond the individual waiver decision. |
| **Georgia Student Data Privacy / SDA** | Aligned with O.C.G.A. §20-2-660 *et seq.* and §20-2-666 *et seq.* [PLACEHOLDER: confirmation of Georgia SDA-specific contractual terms by legal counsel] |
| **PPRA** | The product itself does not solicit PPRA-protected categories and does not administer protected surveys. Counselor-defined intake fields are configured by the district; the district remains responsible for any PPRA obligations arising from fields it adds. |
| **COPPA** | Posture rests on the product being provisioned only to enrolled high-school students (grades 9-12) through the district, rather than being directed to children under 13. |
| **GDPR-style data-subject rights** | Access, correction, export, and deletion rights supported (see Section 6). |
| **Student Privacy Pledge** | Principle-aligned. We adhere to the principles of the Student Privacy Pledge (the formal program was retired by FPF in 2025; its principles are now reflected in state law): no sale of data, no targeted advertising, no profiling beyond the educational purpose, access/correction support, a security program, subprocessor binding, retention limits, prior notice of material change, and privacy-by-design. |
| **Accessibility (WCAG / Section 508)** | Working toward WCAG 2.1 Level AA. [PLACEHOLDER: accessibility conformance report / VPAT status] |
| **De-identified / aggregate data** | No behavioral analytics and no student profiling. Any district-requested usage analysis is reported in aggregate only, with no individual student identifiable and no re-identification (consistent with the DSA's aggregate-reporting requirement). |

---

## Pending Items Summary (business / legal / engineering actions required)

- [PLACEHOLDER: 1EdTech TrustEd Apps membership / certification status]
- [PLACEHOLDER: signed Forsyth County Data Sharing Agreement — pending legal counsel review and authorized signature]
- [PLACEHOLDER: confirmation of Georgia SDA-specific contractual terms by legal counsel]
- [PLACEHOLDER: accessibility conformance report / VPAT — WCAG 2.1 AA audit pending]

---

*Placeholders to be completed before signature:* [COMPANY LEGAL NAME], [COMPANY ADDRESS], [PRIVACY CONTACT EMAIL], [SUPPORT CONTACT], [EFFECTIVE DATE], [GOVERNING DISTRICT DOMAIN].
