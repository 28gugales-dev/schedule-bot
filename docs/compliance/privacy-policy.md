> DRAFT — requires review by qualified legal counsel before publication or signature. Generated to map to the 1EdTech TrustEd Apps Data Privacy Rubric and the Forsyth County School District Data Sharing Agreement.

# Privacy Policy — Schedule AI

**Effective Date:** [EFFECTIVE DATE]

Schedule AI ("the Service," "we," "us," or "our") is a web application that lets high school students submit course-waiver and schedule-change requests and lets school counselors review and approve them. This Privacy Policy explains what information we collect, how we use it, with whom we share it, and the rights and protections that apply. The Service is provided to school districts (each, a "District") and operates under the direction and control of the District. We act as a "school official" with a legitimate educational interest under the Family Educational Rights and Privacy Act (FERPA), and we process student data solely to provide the Service to the District.

---

## 1. Information We Collect

We collect only the information necessary to operate the waiver and schedule-change workflow. The fields we collect are exhaustively enumerated below.

**Student and account information**
- Full name
- School email address (issued by the District; see Section 5 for authentication)
- Grade level
- GPA

**Request and academic content**
- The content of course-waiver and schedule-change requests, including current courses, desired courses, and the student's note
- Uploaded transcript documents
- Answers to counselor-defined intake form fields

**System and access records**
- Audit logs recording who viewed or changed records (see Sections 5 and 9)

### 1.1 Information We Do Not Collect

We do not collect, and the Service is not designed to receive, any of the following data elements (which correspond to the "Prohibited" and "Restricted" data elements under the Forsyth County School District Data Sharing Agreement):

- Social Security numbers
- Personal (non-school) email addresses
- Free/reduced-lunch or economic status
- Race or ethnicity
- Gender
- Date of birth
- Home address
- Special-education status
- Parent contact information

### 1.2 Ownership of Data

The student data processed by the Service remains the property of the District and the students and parents to whom it pertains. We do not own student data, claim no ownership or independent rights in it, and process it solely on the District's behalf and under the District's direction as a school official. We do not retain student data for any independent purpose.

---

## 2. How We Use Information

We use the information we collect solely to provide the Service to the District. Specifically, we use it to:

- Allow students to create and submit course-waiver and schedule-change requests
- Allow counselors and administrators to review, evaluate, and approve or deny those requests
- Generate a recommendation to assist the counselor's review
- Maintain audit logs of access to and changes in student records

**Automated assessment and human decision-making.** The Service uses a deterministic, rule-based scoring engine to assist counselors. The engine evaluates enumerated criteria — GPA thresholds, prerequisites, seat availability, and schedule conflicts — and outputs a recommendation only. **The final decision on every request is always made by a human counselor.** The Service uses **no generative AI and no third-party large language model.** The automated assessment is used only to support the individual waiver decision; it is not used to build any behavioral, profiling, or marketing profile of any student (see Sections 4 and 9).

We do not use student information for any purpose beyond providing the Service — including no use for advertising, marketing, product development, or any other commercial purpose (see Section 4).

---

## 3. Data Sharing & Subprocessors

**No sale of data.** We do not sell, rent, or trade student data to anyone, for any purpose.

**No other recipients.** No third parties other than the subprocessor named below receive student data. We do not share student data with advertisers, data brokers, analytics vendors, or any other recipient.

**Sole infrastructure subprocessor.** Our only subprocessor is:

| Subprocessor | Role | Infrastructure | Data location |
|---|---|---|---|
| Supabase, Inc. | Managed database, authentication, and file storage | Amazon Web Services (AWS), region us-west-1 (Northern California, USA) | United States |

All data — both database records and uploaded documents — is stored in the United States in AWS region us-west-1. Supabase, Inc. runs on Amazon Web Services. We do not transfer student data to any other third party, and we do not store student data outside the United States.

If we engage a different or additional subprocessor, we will provide the District at least 30 days' advance written notice before that subprocessor receives any student data, so the District can review it (see Section 14).

---

## 4. Advertising & Tracking

We do not engage in advertising of any kind in connection with the Service. Specifically:

- No advertising networks
- No web beacons or third-party ad trackers
- No behavioral or targeted advertising
- No use of student data to build advertising or marketing profiles
- No advertising, analytics, or third-party tracking cookies or web beacons

Student data is never sold, rented, or used for marketing, product development, or any other commercial purpose. Data is used solely to provide the Service to the District.

**Do Not Track / Global Privacy Control.** Because the Service performs no cross-site tracking and uses no advertising or analytics cookies, there is no tracking activity for a browser "Do Not Track" (DNT) or Global Privacy Control (GPC) signal to limit.

---

## 5. Data Security

We protect student data with administrative and technical safeguards, including:

- **Encryption in transit.** All connections are encrypted using TLS/HTTPS.
- **Encryption at rest.** Stored data is encrypted using AES-256. Encryption in transit and at rest is provided by Supabase/AWS.
- **Row-Level Security (RLS).** Database-enforced Row-Level Security policies ensure that students can access only their own records and that counselors can access only the records within their assigned scope.
- **Privilege-escalation protection.** Privilege escalation is blocked at the database layer. Students cannot change their own role, GPA, or grade. User roles (student versus counselor/admin) are not self-selected: new accounts default to "student," and staff are elevated only by an existing counselor.
- **Authentication via SSO.** Sign-in uses Google Workspace single sign-on only, restricted to the District's email domain ([GOVERNING DISTRICT DOMAIN]). The Service does not create or store any passwords.
- **Multi-factor authentication (MFA).** MFA is enforced upstream by the District's Google Workspace identity provider.
- **Cookies and session storage.** Any cookies or local storage used by the Service are strictly necessary to authenticate and maintain your sign-in session. We do not use advertising, analytics, or cross-site tracking cookies (see Section 4).
- **Private document storage with signed URLs.** Uploaded documents are stored in a private bucket and are served only through short-lived, signed URLs.
- **Audit logging.** Access to student records is audit-logged, consistent with FERPA's disclosure-logging requirement (34 CFR § 99.32).

---

## 6. Data Retention & Deletion

**Retention period.** We retain student data only for as long as it is needed to provide the Service to the District — that is, for the duration of the District's agreement with us. We do not retain student data for any independent purpose. Upon termination of the District agreement, retained data is governed by the return-and-destruction timeline described below. Individual records are deleted earlier upon a verified parental request, as described below.

**Deletion on parental request.** Students and parents may request deletion of student data. We complete deletion within **10 days** of a verified parental request.

**Return and destruction on termination.** Upon termination of the District agreement:

- We return all District data within **10 business days**.
- We destroy all education records within **45 days**.
- We provide written confirmation of destruction no later than **50 days** after termination.

**Data minimization.** We also delete or de-identify student data that we no longer need to provide the Service.

---

## 7. Your Rights

Students and parents may exercise the following rights with respect to student data:

- **Access.** Request to review the student data we hold.
- **Correction.** Request correction or amendment of inaccurate student data, consistent with the FERPA right to seek amendment of education records.
- **Export.** Request a copy (export) of the student's data.
- **Deletion.** Request deletion of the student's data, which we complete within 10 days of a verified parental request (see Section 6).

**How to make a request.** Parents and eligible students ordinarily submit requests through the District, which routes them to us; the District is the controlling authority for education records under FERPA. Requests may also be sent directly to our privacy contact (Section 15) with the subject line "STUDENT DATA REQUEST." We verify that a request comes from the District, the parent or guardian, or the eligible student before acting on it.

---

## 8. Children's Privacy

The Service is scoped to grades 9–12 and is not intended for, or directed to, children under 13. There are no users under 13. Because the Service is not directed to children under 13 and does not knowingly collect personal information from them, it falls outside the child-directed scope of the Children's Online Privacy Protection Act (COPPA). Where any student is under 18, we process data under the authorization and direction of the District and, where applicable, the parent.

---

## 9. Compliance

We design and operate the Service to meet the following frameworks:

- **FERPA.** We act as a "school official" with a legitimate educational interest, under the direct control of the District, and we use student education records solely to provide the Service. Access to records is audit-logged consistent with 34 CFR § 99.32.
- **SOPIPA (and SOPIPA-equivalent obligations).** We do not engage in targeted advertising, do not build student profiles for any purpose other than the individual waiver decision, and do not sell student data. The deterministic assessment engine supports a single educational decision and creates no behavioral or advertising profile.
- **Georgia Student Data Privacy / Student Data Accessibility, Transparency and Accountability.** We comply with applicable Georgia student-data-privacy requirements, including O.C.G.A. § 20-2-660 et seq. and § 20-2-666 et seq.
- **PPRA.** Consistent with the Protection of Pupil Rights Amendment, we do not use the Service to collect protected-category information for marketing or to administer protected surveys for marketing purposes.
- **COPPA.** Addressed through the 9–12 scoping described in Section 8.
- **Other state privacy laws.** Where students reside in states with student-data-privacy or comprehensive consumer-privacy laws, we support the District's compliance and honor applicable rights of access, correction, and deletion through the District as the controlling authority.
- **Data-subject rights.** We honor data-subject rights of access, correction, export, and deletion, as described in Section 7.

---

## 10. Certifications and Commitments

We align the Service with recognized K-12 student-data-privacy standards:

- **Student Privacy Pledge principles.** We adhere to the principles of the Student Privacy Pledge. (The Future of Privacy Forum retired the formal Pledge program in 2025; its commitments are now substantially reflected in state student-data-privacy law.) In particular: we do not sell student data; we do not use student data for targeted advertising; we do not build a student profile except to support the authorized educational purpose; we collect and use student data only for authorized educational purposes; we support access and correction; we maintain a security program with administrative, technical, and physical safeguards; we contractually bind our subprocessor to equivalent obligations; we limit retention to what the authorized purpose requires; we give prior notice of material changes; and we apply privacy- and security-by-design.
- **1EdTech TrustEd Apps.** This Policy is written to map to the 1EdTech TrustEd Apps Data Privacy Rubric. [PLACEHOLDER: 1EdTech membership / TrustEd Apps Data Privacy certification status — in progress.]

---

## 11. De-identified and Aggregate Data

The Service is not used for behavioral analytics and builds no student profiles. If the District requests a usage analysis — for example, counts of unique users, users per month, and modules used — that analysis is reported only in aggregate: no individual student is identified or identifiable in it, and we do not attempt to re-identify any de-identified or aggregated data.

---

## 12. Accessibility

We are working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. For our current accessibility status, contact us using the information in Section 15.

---

## 13. Breach Notification

We maintain a written breach-response policy. In the event of a security incident affecting student data, we notify the District in writing without undue delay, and in any event within **72 hours** of confirming the incident.

---

## 14. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes — including any change to the subprocessor named in Section 3, for which we provide at least 30 days' advance written notice — we will update the Effective Date above and provide prior notice to the District. Continued provision of the Service after an update is governed by the District agreement then in effect.

---

## 15. Contact

For questions about this Privacy Policy, or to exercise the rights described in Section 7, contact:

- **Company:** [COMPANY LEGAL NAME]
- **Address:** [COMPANY ADDRESS]
- **Privacy contact:** [PRIVACY CONTACT EMAIL]
- **Support:** [SUPPORT CONTACT]
