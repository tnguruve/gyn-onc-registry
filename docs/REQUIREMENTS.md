# Gynaecological Oncology Registry — Project Requirements

**Product:** Gynaecological Oncology Registry  
**Setting:** Parirenyatwa Group of Hospitals (gynaecological oncology service)  
**Version:** 2.1 (target; dictionary V1 + multi-user operational prototype v0.4)  
**Status:** Requirements for product evolution  
**Date:** October 2026  

This document is the full project requirement set. It combines:

- the live application (13 clinical modules, research tab, invite-only access)
- the Master Data Dictionary V1 (22 instruments) and research questions
- the **gyn-onc-registry-multiuser v0.4** prototype (Patient → Tumour architecture, clinical timeline, live MDT/follow-up queues)

---

## 1. Purpose

Build and operate a **prospective gynaecological oncology registry** that:

1. Supports **day-to-day clinic work** (register a patient, complete the chart, MDT, treatment, follow-up).
2. Captures **research-grade variables** once, in the clinical chart, so analyses and exports do not require a second data entry.
3. Protects identity: names, phones, national ID and hospital number are **identifiers** and must be removable from de-identified exports.

The product is a **clinical registry**, not a public website and not an open sign-up system.

---

## 2. Goals

### 2.1 Clinical

- Front desk can register a patient (identity and demographics) without completing oncology modules.
- Clinicians can complete the full pathway from referral through outcome.
- The system shows **live operational queues** calculated from the chart (awaiting histology/imaging, ready/booked MDT, recommendation not implemented, treatment not started, missed follow-up, potential loss to follow-up). Queue membership is **not** a separate status field staff must type.
- A patient is one person. **Same national ID = same patient.** Names may repeat.
- Clinical events (pathology, imaging, MDT, treatment, staging) attach to a **tumour**. Follow-up attaches to the **patient**.

### 2.2 Research

If variables are captured correctly, the registry must later answer:

| # | Question |
|---|----------|
| RQ1 | How many stage IIIC cervical cancers were treated in a given year (e.g. 2027)? |
| RQ2 | What percentage of cervical cancer patients are HIV positive? |
| RQ3 | Median time from referral to MDT? |
| RQ4 | Median time from histological diagnosis to treatment? |
| RQ5 | What proportion of patients booked for MDT actually received the recommended treatment? |
| RQ6 | Outcomes of primary surgery versus neoadjuvant chemotherapy for advanced ovarian cancer? |
| RQ7 | Rate and predictors of loss to follow-up? |
| RQ8 | Postoperative complication rate after radical hysterectomy? |
| RQ9 | Five-year overall survival by FIGO stage? |
| RQ10 | Distribution of endometrial cancer histological subtypes? |

### 2.3 Non-goals (this programme)

- Breast cancer or other non-gynaecological registries (separate product, separate database, separate domain).
- Public self-registration of staff accounts.
- Mixing research “study CRFs” as a second copy of the same clinical data.

---

## 3. Users and access

### 3.1 Roles

| Role (this product) | Prototype v0.4 name | Who | Can do |
|---------------------|---------------------|-----|--------|
| **Administrator** | ADMIN | Registry lead (Dr Guzha after handover) | Full clinical access, invite staff, activity log, users |
| **Clinician** | CONSULTANT / REGISTRAR | Consultants and registrars | Full patient/tumour chart, research charts and de-identified export |
| **Front desk** | *(not in v0.4)* | Reception / clerks | Register and edit demographics only; **no** Research or Activity log |
| **MDT coordinator** | MDT_COORDINATOR | Board coordinator | MDT prep/booking queues, MDT discussion; limited treatment edit (confirm with lead) |
| **Data manager** | DATA_MANAGER | Registry officer | Charts + de-identified export; user support; no invite-admin unless also Administrator |
| **Researcher** | RESEARCHER | Optional | Read charts, research/export; **cannot** register patients |

Handover default: invite Dr Guzha as **Administrator**. Invite front desk as **Front desk**. Invite other doctors as **Clinician**. Add MDT coordinator / data manager only if the department wants those seats.

Export is allowed for Administrator, Clinician (consultant-equivalent), Data manager, and Researcher — not Front desk.

### 3.2 How accounts are created

**Public sign-up is off.**

1. Go-live: run `/setup` once to create a bootstrap administrator.
2. That administrator **invites** the real lead (Dr Guzha) with role **Administrator**.
3. The invitee opens a one-time link (expires in 7 days), sets their own password, and is in.
4. The lead then invites front desk and clinicians the same way.
5. Bootstrap account (`clinician@registry.local`) should be disabled after handover.

**Invite = approval.** There is no pending “request access” queue in the current product. Adding one is out of scope unless requested.

### 3.3 Session and security

- Login with email and password; session cookie (JWT) refreshed from the live user record (role and active status).
- Inactive users cannot sign in.
- Actions (login, create, update, export, invite) are written to the **activity log**.
- Production requires `AUTH_SECRET`, PostgreSQL, HTTPS (Vercel).

---

## 4. Product structure

### 4.1 Application areas

| Area | Route | Purpose |
|------|--------|---------|
| Login | `/login` | Sign in only. Branding: **Gynaecological Oncology Registry** (not a named doctor). |
| Clinic overview | `/dashboard` | Counts, recent patients, clinical tasks |
| Patients | `/patients`, `/patients/new`, `/patients/[id]` | List, register, chart |
| Research | `/research`, `/research/report` | Cohort, quality, delays, survival, export — **read from charts** |
| Activity log | `/admin` | Invites, users, audit |
| Module builder | `/builder` | Optional custom modules (does not replace the 22 core instruments) |

### 4.2 Clinical data architecture (from v0.4)

```
Patient
  ├── identity, referral dates, follow-up visits (patient-level)
  └── Tumour (1..n)     e.g. GYN-000012-T1
        ├── Clinical assessment
        ├── Pathology (repeat)
        ├── Imaging (repeat)
        ├── Staging / FIGO components
        ├── MDT request & discussion
        ├── Surgery / Systemic therapy / Radiotherapy
        ├── Recurrence
        └── Outcome / vital status
```

**Rules**

1. Register the **person** once. Add one or more **tumours** (sequence, site, incidence/diagnosis date).
2. Work-up, MDT, treatment and staging belong to the **tumour**, not a second copy of the patient.
3. Follow-up appointments and missed-visit / LTFU rules belong to the **patient** (one surveillance calendar even if two tumours).
4. Each tumour has derived readiness: `pathology available`, `imaging available`, `mdt status`. Staff do not maintain a separate queue table.
5. The chart shows a **unified clinical timeline** (assessment → pathology → imaging → staging → MDT → treatment → recurrence → outcome), newest first.
6. Mobile-first: phone-friendly add/edit for repeating events.

This is the target model for the live 13-module app, which today hangs diagnosis, imaging, surgery, etc. **directly on Patient** (one diagnosis, one imaging row). Phase 2 migrates those to **Tumour**.

### 4.3 Design principles

- **One patient record.** Research does not duplicate onboarding.
- **Front desk stops at registration.** Diagnosis, MDT, treatment live on the patient chart.
- **Coded fields** (numeric codes) for SPSS/Stata/R, with human labels in the UI.
- **Repeating instruments** where care repeats (referral episodes, scans, operations, MDTs, labs, follow-up).
- **Calculated fields** (age, BMI, delays, survival intervals) are derived, not typed when source dates exist.
- **Conditional logic:** show HIV ART fields only if HIV positive; show symptom duration only if symptom = Yes; show screening detail only if ever screened; molecular fields branch by tumour type.

### 4.4 Identifier policy

Flag as **identifiers** (strip from de-identified export):

- surname, first name(s)
- hospital number
- national ID
- phone numbers
- next of kin name and phone
- residential address (optional: keep district/province in de-identified set)

**Quasi-identifiers** (age, exact dates, district) may remain in research extracts only with ethics approval; default de-identified export should prefer year/month or age band where required.

**National ID:** if provided, must be unique to one patient (normalised: ignore spaces/dashes, case). Duplicate ID opens the existing record. Blank national ID is allowed. Duplicate **names** are allowed.

---

## 5. Current product vs target

The live app has **13 modules**. The dictionary specifies **22 instruments**. Mapping:

| # | Target instrument | Repeat? | Current module | Requirement |
|---|-------------------|---------|----------------|-------------|
| 1 | Patient Registration | No | Module 1 Demographics | Expand |
| 2 | Referral & Care Pathway | Yes | Module 2 Referral & delays | Expand; allow repeats |
| 3 | Presenting History | No / per tumour | — | **New** |
| 4 | Gynaecological & Obstetric History | No | — | **New** |
| 5 | Medical, Family & Social History | No | HIV/ART/Charlson on Module 1 | **Split out** and expand |
| 6 | Cancer-specific risk factors | No / per tumour | — | **New** (conditional) |
| 7 | Clinical Examination | Yes | ECOG/BMI on Module 1 | **New** (repeatable) |
| 8 | Tumour Registration | Yes | Module 3 Diagnosis | Split; one patient, many tumours |
| 9 | Pathology | Yes | Module 6 Histopathology | Expand; repeating specimens |
| 10 | Laboratory Results | Yes | Markers on histopathology | **Split**; row per test |
| 11 | Imaging | Yes | Module 4 Imaging (single) | Expand; one row per study |
| 12 | Staging | Yes | FIGO/TNM on Module 3 | **Split**; system + version |
| 13 | MDT Preparation | Yes | Dashboard MDT pending only | **New** |
| 14 | MDT Discussion | Yes | MDT (date, type, summary) | Expand |
| 15 | Treatment Plan | Yes | — | **New** |
| 16 | Surgery | Yes | Module 5 Surgery | Expand |
| 17 | Systemic Therapy | Yes | Module 7 Chemotherapy | Expand / rename |
| 18 | Radiotherapy | Yes | Module 8 Radiotherapy | Expand |
| 19 | Complications | Yes | Module 9 Complications | Keep / expand |
| 20 | Follow-up | Yes | Module 10 Follow-up | Expand |
| 21 | Recurrence / Progression | Yes | Module 11 Recurrence | Expand |
| 22 | Outcome / Vital Status | Yes | Module 12 Survival | Keep / expand |
| — | Research / biobank | No | Module 13 | **Keep** (not in dictionary V1; required for consent/export) |

---

## 6. Functional requirements — clinic workflow

### FR-C1 Patient list

- Search by registry ID, hospital number, name.
- Filter by workflow: all, draft, in treatment, MDT pending, follow-up.
- Open chart; create new patient (permission `patients:create`).

### FR-C2 Register patient (Instrument 1)

Required: first name, surname, date of birth, registry ID (auto `GYN-000001` style), hospital number, country, province, district, registration date, registering facility.

Optional: national ID, phones, address, residence type, occupation, education, marital status, next of kin.

Calculated: age at registration.

On save: if national ID matches an existing patient, **do not create a duplicate** — open that chart.

### FR-C3 Patient chart

- All instruments listed in section 7, in clinical order.
- Repeatable instruments: add / list / edit / delete (where permitted).
- Save per module with confirmation.
- Workflow status derived from data (draft, MDT pending, in treatment, follow-up, etc.).

### FR-C4 Dashboard (clinical operations — v0.4)

The home screen is a **clinical operations dashboard**, not a research page.

**Summary cards:** registered patients; ready for MDT; treatment pending; missed follow-up.

**Live queues** (each shows count + up to N patients with registry ID, name, site/FIGO, next action). Clicking a row opens the patient chart. Empty queues show “No patients in this queue.”

| Queue | When a tumour/patient appears |
|-------|--------------------------------|
| Awaiting histology | Pathology not yet available |
| Awaiting imaging | Pathology available, imaging not yet available |
| Ready for MDT | Histology + imaging available, MDT not booked/discussed/initiated |
| Booked for MDT | MDT status = Booked (show meeting date) |
| Recommendation not implemented | Latest MDT has a recommendation and `implemented` is not true |
| Treatment not started | Recommendation exists, no surgery/systemic/radiotherapy yet, not implemented |
| Missed follow-up | Latest follow-up `nextAppointment` is in the past |
| Potential LTFU | Missed follow-up **and** overdue ≥ **90 days** (pilot default) |

**Rules**

- Queue membership is **calculated** from longitudinal records. Do not store a duplicate “queue status” field for staff to keep in sync.
- The **90-day potential-LTFU threshold is a department policy setting**, not hard-coded forever. Confirm with the service before production.
- Front desk may see registration/drafts only; clinicians, MDT coordinator and admin see the full queue board.
- Do not mix research export marketing into this dashboard.

### FR-C6 Tumour chart and timeline (v0.4)

On the patient record:

- Header: registry ID, name, hospital number, referral date, first review, tumour count, follow-up count.
- Patient-level **add follow-up** (date, disease status, ECOG, notes, next appointment).
- For each tumour: code + site, histology, FIGO, HIV; badges **Histology ✓/✕**, **Imaging ✓/✕**, MDT status; “MDT inputs ready” vs “Work-up incomplete”.
- Quick-add events on the tumour: clinical assessment, pathology, imaging, FIGO staging, MDT, treatment (surgery / systemic / radiotherapy), recurrence, outcome.
- **Clinical timeline** of those events, newest first.

Saving pathology or imaging must update readiness so queues move without a second “mark ready” click (or a single explicit ready flag derived from “at least one complete report”).

### FR-C5 Delete patient

- Only roles with `patients:delete`. Confirm before delete. Audit the action.

---

## 7. Functional requirements — instruments (data dictionary)

Convention: **R** required, **O** optional, **C** conditionally required.  
Types: text, date, integer, float, radio, dropdown, checkbox, notes, calculated, auto.

Unknown should be a coded value (typically `9` or `99`), not a blank, where specified.

### Instrument 1 — Patient Registration (not repeating)

| Variable | Label | Type | Coding / notes | Req |
|----------|-------|------|----------------|-----|
| registry_id | Gyn Oncology Registry ID | auto | `GYN-000001` | R |
| hospital_no | Hospital number | text | identifier | R |
| national_id | National ID | text | identifier; unique if present | O |
| surname | Surname | text | identifier | R |
| first_name | First name(s) | text | identifier | R |
| dob | Date of birth | date | YYYY-MM-DD | R |
| age_reg | Age at registration | calculated | years | R |
| sex_birth | Sex at birth | radio | Female / Male / Intersex / Unknown | R |
| phone_primary | Primary phone | text | identifier | O |
| phone_alt | Alternative contact | text | identifier | O |
| address | Residential address | notes | identifier | O |
| country | Country | dropdown | coded | R |
| province | Province | dropdown | local codes | R |
| district | District | dropdown | local codes | R |
| residence_type | Residence | radio | Urban / Rural / Peri-urban / Unknown | O |
| occupation | Occupation | text/coded | | O |
| education | Highest education | radio | None / Primary / Secondary / Tertiary / Other | O |
| marital_status | Marital status | radio | coded | O |
| next_kin | Next of kin | text | identifier | O |
| nok_phone | Next-of-kin phone | text | identifier | O |
| registration_date | Registry registration date | date | | R |
| registration_site | Registering facility | dropdown | facility list | R |

### Instrument 2 — Referral & Care Pathway (repeating)

Purpose: delay research (RQ3, RQ4, district → delay, source → stage).

Core fields: `referral_date`, `referral_received`, `referral_source`, `referral_facility`, `referral_level`, `referral_reason` (checkbox), `suspected_ca`, `referral_urgency`, `first_contact_date`, `first_seen_date`, `referral_delay_days` (calculated: referral → first review), `previous_facilities` (integer), `referral_notes`.

**referral_source**

1 District hospital · 2 Provincial hospital · 3 Central/tertiary · 4 Private practitioner · 5 Private hospital · 6 Screening programme · 7 HIV/ART clinic · 8 Emergency department · 9 Self-referral · 10 Other · 99 Unknown

Retain existing delay dates where useful: symptom start, first facility visit, diagnosis date, treatment start (diagnosis/treatment start may later live on tumour/treatment instruments; do not lose the calculations).

### Instrument 3 — Presenting History (per tumour or once)

First: `chief_complaint`, `symptom_onset_date`, `symptom_duration_months`.

Then structured symptoms, each **0 No | 1 Yes | 9 Unknown**. If Yes, show `[symptom]_duration`.

Groups:

- Bleeding: postcoital, postmenopausal, intermenstrual, heavy menstrual, irregular, contact bleeding  
- Vaginal/vulval: discharge, offensive discharge, pruritus, lesion, ulcer, mass  
- Pain: pelvic, abdominal, back, bone  
- Ovarian-type: distension, mass, early satiety, reduced appetite, bloating  
- Advanced: weight loss, fatigue, leg swelling, dyspnoea  
- Urinary: frequency, dysuria, haematuria, incontinence, flank pain  
- Bowel: constipation, diarrhoea, rectal bleeding, tenesmus  

### Instrument 4 — Gynaecological & Obstetric History (not repeating)

**Menstrual:** `menarche_age`, `lmp`, `menstrual_status` (1 Premenopausal, 2 Perimenopausal, 3 Postmenopausal, 4 Surgical menopause, 9 Unknown), `menopause_age`, `years_postmenopause` (C).

**Obstetric:** `gravidity`, `parity`, `living_children`, `age_first_pregnancy`, `age_first_birth`.

**Contraception:** ever, OCP, duration, injectable, implant, IUD.

**Cervical screening:** `screened_ever`; if yes: last screen date, method, result, previous abnormal, previous CIN, grade, treatment.

Supports cervical-cancer prevention analyses.

### Instrument 5 — Medical, Family & Social History (not repeating)

**Medical (Yes/No/Unknown):** hypertension, diabetes, obesity, renal disease, cardiac disease, TB history, previous cancer, previous radiotherapy, previous chemotherapy.

**HIV**

- `hiv_status`: 0 Negative, 1 Positive, 2 Not tested, 9 Unknown  
- If positive (C): `hiv_diagnosis_date`, `art_status`, `art_regimen`, `art_start_date`, `latest_cd4`, `cd4_date`, `viral_load`, `viral_load_date`

Required for RQ2.

**Smoking:** Never / Former / Current / Unknown; `pack_years` if ever.

**Family cancer:** Yes/No/Unknown; if yes, repeating relatives: relative, cancer type, age at diagnosis.

### Instrument 6 — Cancer-specific risk factors (conditional, per tumour)

Fields depend on primary site (e.g. HPV/screening residual risk for cervix; HRT/tamoxifen for endometrium; BRCA family for ovary). Exact field list to be finalised per site in dictionary V1.1. Must not clutter the chart when irrelevant.

### Instrument 7 — Clinical Examination (repeating)

`exam_date`, `examiner`, `height_cm`, `weight_kg`, `bmi` (calculated), `ecog_status`.

General: pallor, jaundice, cachexia, oedema, supraclavicular nodes, inguinal nodes.  
Abdomen: mass, size cm, clinical ascites, hepatomegaly.  
Vulva: lesion, site, size mm, midline involvement.  
Speculum: cervix visible, lesion, tumour size cm, appearance, contact bleeding, vaginal involvement.  
Bimanual/rectovaginal: uterine size/mobility, adnexal mass, pelvic mass size, parametrium R/L, pelvic sidewall, rectal involvement, suspected bladder involvement.

### Instrument 8 — Tumour Registration (repeating) — IARC core

A patient may have more than one tumour. This is the primary analytic unit for cancer counts.

| Variable | Meaning | Req |
|----------|---------|-----|
| tumour_id | Unique tumour ID | R |
| sequence_primary | Primary tumour sequence | R |
| incidence_date | Date of incidence | R |
| primary_site | Clinical site category | R |
| laterality | Where relevant | O |
| histology_summary | Histological diagnosis | C |
| icdo_topography | ICD-O topography | R (target) |
| icdo_morphology | ICD-O morphology | R (target) |
| icdo_behaviour | ICD-O behaviour | R (target) |
| tumour_grade | Grade | O |
| basis_diagnosis | Basis of diagnosis | R |
| diagnosis_date | Confirmed diagnosis date | R |

**primary_site (clinical convenience codes — keep ICD-O as well)**

1 Cervix · 2 Endometrium/uterine corpus · 3 Ovary · 4 Fallopian tube · 5 Primary peritoneal · 6 Vulva · 7 Vagina · 8 GTN · 9 Uterine sarcoma · 10 Other uterine · 11 Unknown primary · 12 Other  

IARC expects unique identification, incidence date, site/topography, morphology, behaviour, and basis of diagnosis.

RQ1, RQ6, RQ10 depend on this instrument.

### Instrument 9 — Pathology (repeating)

`path_id`, `specimen_date`, `path_report_date`, `laboratory`, `path_number`, `specimen_type`, `anatomical_site`, `histology`, `icdo_morphology`, `grade`, `tumour_size`, `depth_invasion`, `lvsi`, `perineural_invasion`, `margin_status`, `closest_margin_mm`, `nodes_examined`, `nodes_positive`, `extracapsular_extension`.

Molecular/IHC (branch by tumour type): p16, p53, ER, PR, HER2, MMR, MLH1, MSH2, MSH6, PMS2, MSI, POLE, HPV association.

RQ4 uses histological diagnosis date. RQ10 uses endometrial histology.

### Instrument 10 — Laboratory Results (repeating rows)

Do **not** add hundreds of columns. One row:

`lab_date`, `lab_category`, `lab_test`, `lab_value`, `lab_unit`, `reference_low`, `reference_high`, `abnormal_flag`, `laboratory`.

Predefined tests: Hb, WBC, neutrophils, platelets, creatinine, eGFR, urea, Na, K, bilirubin, ALT, AST, ALP, albumin, CA-125, CEA, CA19-9, AFP, LDH, β-hCG.

Move CA-125 / β-hCG / etc. off the histopathology form.

### Instrument 11 — Imaging (repeating)

`imaging_id`, `imaging_date`, `modality` (US / CT / MRI / PET-CT / CXR / Other), `facility`, `indication`, primary tumour seen, tumour size, local extension, pelvic / para-aortic / inguinal nodes, ascites, peritoneal disease, omental disease, liver / lung / bone / other metastases, radiology impression, report uploaded (yes/no; file storage optional later).

### Instrument 12 — Staging (repeating)

Must **not** be a single unlabeled “FIGO stage”.

`staging_system`, `staging_version`, `stage_date`, `clinical_stage`, `pathological_stage`, `final_stage`, `basis` (Clinical / Imaging / Pathological / Combined), optional `substage`.

**Cervical component staging (v0.4 — required for validation later):** tumour size cm, vaginal involvement (none / upper third / lower third), parametrium, pelvic wall, hydronephrosis, bladder invasion, rectal invasion, pelvic nodes, para-aortic nodes, distant metastasis. These components must be stored so stage can be checked against FIGO rules in a later milestone.

Example: FIGO 2009 vs FIGO 2023 endometrial must remain distinguishable.

RQ1 and RQ9 require FIGO (with version) plus calendar year of incidence/treatment.

### Instrument 13 — MDT Preparation (repeating)

Operational: ready-for-board checklist.

`mdt_request_date`, `mdt_indication`, histology required/available, imaging required/available, labs complete, clinical summary complete, `mdt_ready`, `mdt_booking_date`, `mdt_scheduled_date`, `mdt_status`, `reason_not_ready`.

**mdt_status:** 1 Not ready · 2 Awaiting histology · 3 Awaiting imaging · 4 Awaiting other investigation · 5 Ready—not booked · 6 Booked · 7 Discussed · 8 Recommendation documented · 9 Treatment initiated · 10 Deferred · 11 Cancelled  

Dashboard rule: histology available + imaging available + MDT not booked → task.

### Instrument 14 — MDT Discussion (repeating)

`mdt_date`, `tumour_id`, presenting clinician, `mdt_question`, stage at MDT, performance status, `mdt_decision`, `treatment_intent`, recommended surgery / systemic / radiotherapy / investigation / palliation, notes, responsible clinician, `target_treatment_date`.

**Critical for RQ5:** `mdt_recommendation_implemented` (Yes/No); if No, `reason_not_implemented`.

### Instrument 15 — Treatment Plan (repeating)

Intended management vs later actual treatment (surgery, systemic, radiotherapy, palliative, further investigation). Links to tumour and MDT recommendation. Required to audit “recommended vs given”.

### Instrument 16 — Surgery (repeating)

`surgery_date`, `procedure`, `intent`, surgeon, assistant, anaesthesia, `approach`, operative findings, disease distribution, ascites, peritoneal disease, nodes, procedure completed, `residual_disease`, `blood_loss_ml`, transfusion, intra-op complication, post-op complication, `clavien_dindo`, ICU, `hospital_stay_days`, discharge date, `readmission_30d`, `mortality_30d`, `mortality_90d`.

Ovarian cytoreduction: surgical complexity and residual disease (CC score) — already partly in the app; keep and complete.

RQ6, RQ8.

### Instrument 17 — Systemic Therapy (repeating)

`therapy_date`, `therapy_type`, `intent`, `regimen`, `cycle_number`, drug, dose, unit, dose reduction, reason, adverse event, CTCAE grade, cycle completed, therapy completed, reason stopped, `response`.

Includes neoadjuvant chemotherapy (RQ6).

### Instrument 18 — Radiotherapy

`rt_indication`, `rt_intent`, `rt_start`, `rt_end`, EBRT (yes, dose, fractions), brachytherapy (yes, dose, fractions), interruption (yes, days, reason), `rt_completed`, toxicity.

### Instrument 19 — Complications (repeating)

Date, type, Clavien-Dindo, readmission, reoperation, ICU, 30- and 90-day mortality. Link to procedure when known (for RQ8 radical hysterectomy).

### Instrument 20 — Follow-up (repeating, indefinite)

`followup_date`, months from diagnosis (calculated), months from treatment (calculated), `disease_status`, ECOG, symptoms, exam findings, imaging done, tumour markers, late toxicity, `recurrence_suspected`, `next_visit`.

**disease_status:** 1 NED · 2 CR · 3 PR · 4 SD · 5 Persistent · 6 Progressive · 7 Recurrent · 8 Unknown  

RQ7, RQ9.

### Instrument 21 — Recurrence / Progression

`recurrence_date`, type, site, local / regional / distant flags, confirmation method, disease-free interval (calculated), treatment recommended, treatment given.

### Instrument 22 — Outcome / Vital Status

`last_contact_date`, `vital_status`, `death_date`, `cause_death`, `cancer_related_death`, `lost_followup`, `lost_followup_date`.

RQ7, RQ9.

### Instrument 23 (keep) — Research / biobank

Not in dictionary V1; retain: consent for research, genetics, tissue bank, blood samples, genomic testing, QoL/PROMs notes. Research export default filter: **consent = yes** when ethics requires it.

---

## 8. Functional requirements — research

Research is a **separate area of the product**, populated only from patient charts.

### FR-R1 Cohort

Filters: consent, cancer/primary site, province, diagnosis (or incidence) date range, FIGO, HIV.

Stats: n in view, registry total, research-ready, completeness, consent count, median diagnosis delay, median treatment delay.

### FR-R2 Quality

Missingness table; list of records below completeness threshold with link back to chart.

### FR-R3 Analyses in product

- Diagnosis / site distribution  
- FIGO distribution (by staging version when split)  
- Delay histograms (referral, diagnosis, treatment)  
- Kaplan–Meier OS and PFS when follow-up and vital status exist  

### FR-R4 Export

- Formats: CSV, SPSS syntax, Stata do-file  
- Shared row builder; **no names, phones, national ID** in de-identified files  
- Optional: omit hospital number and district  
- Consent-only switch; date range; site filter  
- Saved presets (user browser)  
- Printable ethics summary (`/research/report`)  
- Export events in audit log  

### FR-R5 Traceability

Each cohort row links to the patient chart (clinical users). Researchers without edit rights still need a read path consistent with permissions.

---

## 9. Calculated metrics (must be reproducible)

| Metric | Inputs | Used for |
|--------|--------|----------|
| Age at registration | dob, registration_date | Demographics |
| BMI | height_cm, weight_kg | Exam / registration |
| Referral delay days | referral_date, first_seen_date | RQ3 |
| Diagnosis delay | symptom or first visit → diagnosis_date | Delays |
| Treatment delay | diagnosis_date → first treatment start | RQ4 |
| Disease-free interval | diagnosis or treatment end → recurrence_date | RQ6/RQ9 |
| OS / PFS time | diagnosis_date, death_date, last_contact, recurrence_date | RQ9 |
| Completeness % | required variables present per tumour | Data quality |

---

## 10. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Web app, desktop and phone usable; clinic network in Zimbabwe. |
| NFR-2 | PostgreSQL (Neon); no patient data in git. |
| NFR-3 | Hosting: Vercel; custom gyn-oncology domain (not used for other diseases). |
| NFR-4 | All writes audited (who, when, what entity). |
| NFR-5 | Role-based permissions enforced on server actions, not only in the UI. |
| NFR-6 | De-identified export must not include flagged identifiers. |
| NFR-7 | Registry numbers unique; generation must not collide (numeric max, not string sort). |
| NFR-8 | Database sleep (Neon free tier) must fail with a clear message, not a raw Prisma error. |
| NFR-9 | Codes stable over time; staging **version** stored so FIGO revisions do not rewrite history. |
| NFR-10 | ICD-O codes stored in addition to clinical site categories. |
| NFR-11 | Phone and desktop layouts; repeating events usable on a phone. |
| NFR-12 | Session timeout (prototype: 8 hours); production timeout to be agreed (current live app uses `SESSION_TIMEOUT_MINUTES`). |
| NFR-13 | Default seed passwords and `AUTH_SECRET` must be replaced before any real-patient pilot. |
| NFR-14 | Potential-LTFU window is configuration, default 90 days. |

---

## 11. Alignment of research questions to data

| RQ | Minimum data |
|----|----------------|
| RQ1 Stage IIIC cervix in year | Inst. 8 site=cervix; Inst. 12 final FIGO=IIIC + version; incidence or treatment year |
| RQ2 HIV % in cervix | Inst. 8 cervix; Inst. 5 hiv_status |
| RQ3 Median referral → MDT | Inst. 2 referral_date; Inst. 14 mdt_date |
| RQ4 Median histology → treatment | Inst. 9 path_report or diagnosis_date; Inst. 16–18 first treatment date |
| RQ5 MDT rec received | Inst. 14 implemented flag; Inst. 15–18 actual treatment |
| RQ6 Surgery vs NACT ovary | Inst. 8 ovary + stage; Inst. 15–17 intent and sequence; Inst. 22 outcome |
| RQ7 Loss to follow-up | Inst. 20 visits; Inst. 22 lost_followup |
| RQ8 Complications after radical hyst | Inst. 16 procedure; Inst. 19 complications |
| RQ9 5-year OS by FIGO | Inst. 12 stage; Inst. 22 vital status + dates |
| RQ10 Endometrial subtypes | Inst. 8 site=endometrium; Inst. 9 histology / ICD-O morphology |

---

## 12. Delivery phases

Do not replace the live 13-module chart in one step.

### Phase 0 — Handover (no dictionary change)

- Branding: Gynaecological Oncology Registry  
- Invite-only admin; Dr Guzha invited as Administrator with his email  
- Disable bootstrap account after he is in  
- Document login for front desk vs clinician  

### Phase 1 — Unlock the ten research questions on existing modules

- Complete referral dates and calculated delays  
- Keep HIV usable and correctly coded  
- FIGO + year reliable; add staging version field on diagnosis until Inst. 12 exists  
- MDT: recommendation + implemented yes/no  
- Follow-up disease status codes; vital status + lost to follow-up  
- Export remains de-identified  

### Phase 2 — Patient → Tumour model (v0.4 core)

- Tumour Registration (repeating) + tumour-level events  
- Staging with system/version **and** cervical FIGO components  
- Multiple tumours per patient; timeline on the chart  
- Derived histology/imaging readiness and MDT status  

### Phase 3 — Operational queues

- Dashboard queues in §FR-C4  
- Configurable LTFU days (pilot 90)  
- Missed follow-up from `nextAppointment`  
- MDT coordinator role if the department wants it  

### Phase 4 — New history and exam

- Presenting history, gyn/obstetric + screening, medical/family/social split from Module 1  
- Clinical examination / assessment repeating (v0.4 assessment fields as starting UI)  

### Phase 5 — Repeating investigations and labs

- Imaging as study list  
- Pathology as specimen list  
- Laboratory as test rows  
- Full 306-field dictionary mapping with branching (prototype milestone)  

### Phase 6 — Treatment plan and systemic detail

- Treatment plan instrument  
- Cycle-level systemic therapy  
- Radiotherapy interruptions and brachy detail  

### Later (governance)

- Password reset, MFA or institutional SSO  
- Richer audit (old/new values)  
- Prisma **migrations** instead of `db push` in production  
- MDT booking calendar  
- Cervical FIGO validation from stored components  

Each phase must keep **front desk registration** working and **research reading the same charts**.

**Pilot safety:** fictional or de-identified patients until TLS, backups, institutional approval, and production hosting are validated. This registry is **not** a certified EHR and is **not** a substitute for the source medical record.

---

## 13. Acceptance criteria (product level)

1. A clerk can register a patient with name, DOB and hospital number and receive a registry ID without opening oncology modules.  
2. Two people with the same name can both exist; two records with the same national ID cannot.  
3. A clinician can record referral dates and the system shows delay in days.  
4. A clinician can record HIV status and, if positive, ART fields.  
5. A clinician can record primary site, histology, FIGO with staging version, and year.  
6. A clinician can record an MDT decision and whether it was implemented.  
7. Follow-up visits and vital status (including lost to follow-up) can be entered over time.  
8. Research view updates from the chart without a second form.  
9. De-identified export contains no name, phone, or national ID.  
10. Only an administrator can invite a new user; the invitee sets their own password.  
11. Front desk cannot open Research.  
12. The ten research questions in §2.2 are answerable from exported or in-app cohort data after Phases 1–2 (full precision after later phases).  
13. A patient can have more than one tumour; pathology/imaging/MDT/treatment attach to the tumour; follow-up attaches to the patient.  
14. The operations dashboard lists patients in awaiting-histology, ready-MDT, recommendation-not-implemented, missed follow-up, and potential-LTFU without staff typing a queue name.  
15. De-identified export is forbidden for Front desk; allowed roles are enforced on the server.  

---

## 14. Infrastructure and operations

| Item | Requirement |
|------|-------------|
| Domain | Gynaecological oncology only |
| App hosting | Vercel |
| Database | Neon PostgreSQL — **dedicated project** for this registry |
| Environments | Local (`npm run dev:mac`), production |
| Secrets | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `SETUP_SECRET` (production setup) |
| Backup | Neon history on paid plan; free tier not sufficient for production retention |

Staff time, ethics approval, and devices are the client’s responsibility, not software fees.

---

## 15. Glossary

| Term | Meaning |
|------|---------|
| Instrument | A form/module on the patient chart |
| Repeating | Many records per patient (or per tumour) |
| Tumour | A primary cancer record under a patient; analytic unit for stage/treatment |
| Queue | Calculated work list (not a stored status staff update by hand) |
| LTFU | Loss to follow-up; pilot = missed appointment ≥ 90 days |
| Identifier | Direct personal identifier; strip from research files |
| Incidence date | Date used for cancer registration (IARC) |
| FIGO version | Which FIGO edition the stage code belongs to |
| MDT | Multidisciplinary team meeting |
| De-identified export | Analytic file without names/phones/national ID |

---

## 16. Document control

| | |
|--|--|
| Source A | Live application `obgyn-registry` (13 modules) |
| Source B | Master Data Dictionary V1 / research questions (Word, Oct 2026) |
| Source C | `gyn-onc-registry-multiuser-v0.4` (Patient→Tumour, timeline, operational queues) |
| Owner | Product / registry lead |
| Next review | After Phase 1 field list is locked with the clinical lead |

Changes to coded lists (HIV, FIGO, referral source, disease status) require a version note so old records stay interpretable.
