# Handoff: Gynaecological Oncology Registry

## Overview
A clinical data platform for a gynaecological-oncology registry: clinicians authenticate, then
register patients, review them across 11 clinical modules, build custom data-collection modules,
run research exports, and view dashboards/reports. The design covers two artifacts:

- **`Welcome.dc.html`** — the authentication flow (welcome → sign-in → 2FA → landing).
- **`Registry.dc.html`** — the authenticated application: an 8-screen single-page app with a
  persistent sidebar + topbar and hash-based routing.

The product is desktop-first clinical software (designed at ~1280–1440px wide). Sample patient
context is Parirenyatwa Group of Hospitals (Zimbabwe).

## About the Design Files
The bundled `.dc.html` files are **design references created in HTML** — interactive prototypes
that show the intended look and behavior. They are **not production code to copy directly.**
They run on a small in-house template runtime (`support.js`, included only so the prototypes open
in a browser); **do not port `support.js` or the `.dc.html` template syntax** to your codebase.

Your task: **recreate these designs in the target app's environment** using its established
framework, component library, routing, and state patterns (React, Vue, SwiftUI, etc.). If no
codebase exists yet, choose an appropriate stack (e.g. React + a router + a styling solution) and
implement there. Treat the HTML as the source of truth for layout, spacing, color, type, copy, and
interaction — re-express it idiomatically.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified below and
present in the files. Recreate the UI pixel-faithfully using your codebase's libraries.

---

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| Teal 700 (primary) | `#0C4F4E` | Primary buttons, active states, sidebar top, headings accents |
| Teal 800 | `#0A3C3D` | Sidebar gradient bottom |
| Teal 600 | `#14807E` | Avatars, secondary teal, chart bar |
| Teal soft bg | `#ECF3F2` | Active/selected tints, icon chips, badges |
| Teal soft bg 2 | `#E7F1EE` | Alt tint |
| Teal soft border | `#D5E4E2` | Borders on teal tints |
| Plum (accent) | `#7A3B5E` | Secondary accent, links, badges, "active" notification dot |
| Plum light | `#C98AAE` | Decorative accents, chart segment |
| Plum soft bg | `#F3E9EF` | Plum tint chips/badges |
| Paper (app bg) | `#F4F1EB` | Page background |
| Surface | `#FFFFFF` | Cards, inputs |
| Ink (text) | `#1A2421` | Primary text |
| Muted text | `#5C6B66` | Secondary text |
| Faint text | `#7C8983` | Tertiary text / captions |
| Placeholder | `#9aa5a0` / `#a7b0ab` | Input placeholders, faint labels |
| Border | `#E7E2D7` / `#E2DDD3` / `#EAE5DA` | Card/input/row borders (warm grey) |
| Hairline | `#F0ECE3` / `#F4F0E8` | Row dividers |
| Readonly input bg | `#F7F4EE` | Disabled/computed fields |
| Success green | `#1F8A5B` | "Signed in", healthy, positive outcomes |
| Warning amber | `#9A6B17` / `#FBEFD9` (bg) | In-treatment, drafts, "alive with disease" |
| Danger red | `#B23A48` / `#FBEAEC` (bg) | Errors, overdue, deceased, surgery-booked |
| Chart bar (inactive) | `#9DC4C1` | Registration bars (non-current month) |
| Chart gold | `#D8B23A` | GTD diagnosis segment |

Status pill palette (bg / text):
- Draft `#F4F0E8` / `#8A7E66`
- In treatment `#FBEFD9` / `#9A6B17`
- MDT pending `#F3E9EF` / `#7A3B5E`
- Follow-up `#E7F1EE` / `#0C5C4E`
- Surveillance `#EAF0F6` / `#3A5A8A`
- Surgery booked `#FBEAEC` / `#B23A48`
- HIV positive `#F3E9EF` / `#7A3B5E`; HIV negative `#EEF1EC` / `#5C6B66`

### Typography
- **Display / headings:** `Spectral` (serif), weights 500/600. Used for page titles, card
  numbers/stats, hero, screen H2s. Letter-spacing -0.2 to -0.5px on large sizes.
- **Body / UI:** `IBM Plex Sans`, weights 400/500/600/700. Default for all controls and text.
- **Mono / data:** `IBM Plex Mono`, weights 400/500. Patient IDs, timestamps, percentages,
  version strings, code-like values.
- Load from Google Fonts (families: Spectral, IBM+Plex+Sans, IBM+Plex+Mono).

Representative sizes (px): hero 50 / screen H2 30–34 / card stat number 28–30 / section title 15 /
body 13.5–16 / label 12.5 (weight 600) / caption 11.5–12.5 / mono id 11.5–13.

### Spacing, radius, shadow
- Spacing rhythm: 6, 8, 10, 12, 14, 16, 18, 22, 24, 30, 32px.
- Radius: inputs/buttons 10–12px; cards 14–16px; chips/pills 999px; small icon chips 7–9px.
- Primary button shadow: `0 10px 24px -10px rgba(12,79,78,.65)` (hover `0 14px 30px -10px rgba(12,79,78,.7)`).
- Card hover lift: `translateY(-2px)` + `0 12px 26px -16px rgba(12,79,78,.5)`, border → `#0C4F4E`.
- Input focus: border `#0C4F4E` + ring `0 0 0 4px rgba(12,79,78,.10)`.

### Motion
- Entrance: fade + 10–14px rise, ~0.4–0.7s ease, staggered 0.04–0.32s.
- Chart bars: scaleY grow from bottom, 0.5s ease.
- Transitions: background/border/transform 0.15–0.2s ease.
- Spinner: 0.7s linear rotate. Toast: rise-in 0.35s.

---

## Welcome.dc.html — Authentication flow

Split layout, full viewport. **Left panel (44% width, min 460px):** deep-teal radial gradient
(`#14706E → #0C4F4E → #0A3C3D`) with a soft plum radial glow (animated, 9s pulse), a faint 46px
grid overlay masked to the top-left, and content: brand lockup (ring-with-dot logo mark +
"GYN-ONC REGISTRY" mono caption), eyebrow "CLINICAL DATA PLATFORM" (plum, mono, letter-spacing 3px),
H1 "Gynaecological Oncology Registry" (Spectral 50px/500), a supporting paragraph, three stats
(11 Core modules · 6 Export formats · ∞ Custom fields, divided by vertical hairlines), and a footer
row ("v2.2 · Final" / "Secure · Audit-logged · Role-based").

**Right panel (fills rest):** centered ~400px column with a step indicator (3 segments, top-right;
active segment is wider and teal). Four sequential screens, swapped by state (`screen`):

1. **Welcome** — eyebrow "Welcome", H2 "Sign in to the registry", body, primary button
   "Continue to sign in →", divider "or", secondary outline button "Continue with hospital SSO",
   fine print. Both buttons advance to Sign in.
2. **Sign in** — "← Back", H2 "Staff sign in", Username input, Password input (with "Forgot?"
   link), inline error block (red) on failure, "Keep me signed in" checkbox, primary "Sign in"
   button (shows spinner while loading). Demo rule: any username + password `registry`. Wrong
   password → error "Incorrect credentials…". On success → 0.85s spinner → Verify.
3. **Verify** — "← Back", lock icon chip, H2 "Verify it's you", body, six single-digit OTP boxes
   (54×60px, mono 24px, auto-advance on input, backspace moves focus back), error on invalid,
   primary "Verify & enter registry" (spinner 0.9s). Demo code: `000000`. On success → Home.
4. **Home** — "Signed in" green pill, H2 "Welcome back, {firstName}" (derived from username),
   subline "Registry Clinician · Parirenyatwa Group of Hospitals", a 2×2 grid of tiles
   (Open dashboard / New patient / Find patient / Export data), and a "Sign out" text button.
   Each tile navigates to `Registry.dc.html#<route>` (dashboard / new / patients / exports).

**State:** `screen` ('welcome'|'signin'|'verify'|'home'), `username`, `password`, `remember`,
`otp` (6-char array), `error`, `otpError`, `loading`. Validation as described; all transitions
gated through the loading spinner with the stated delays.

---

## Registry.dc.html — Application shell

**Layout:** full-height flex. **Sidebar (248px, fixed):** teal vertical gradient; brand lockup at
top; nav list; user block pinned to bottom (avatar "JM", "Dr. J. Moyo / Registry Clinician",
power-icon link → `Welcome.dc.html`). **Main column:** topbar (70px) + scrollable content
(max-width 1120px, centered, 30–32px padding).

**Topbar:** page title (Spectral 21/600) + subtitle (per route), then right-aligned: global search
input (320px, magnifier glyph, placeholder "Search patient ID, name, diagnosis…"), an org status
pill ("● Parirenyatwa Group of Hospitals", green dot), and a notification button with a plum dot.

**Sidebar nav items** (icon + label; active item has bg `rgba(234,242,240,.14)`, white text,
weight 600; others `rgba(234,242,240,.72)`): Dashboard ▦, Patients ❏ (badge "7"), New patient ＋,
Module builder ⚙, Reports ▤, Export & research ⤓, Admin ☷.

**Routing:** hash-based (`#dashboard`, `#patients`, `#new`, `#record`, `#builder`, `#reports`,
`#exports`, `#admin`). `record` maps the sidebar highlight to Patients. Reads initial route from
`location.hash`; listens to `hashchange`. Implement with your router; deep-linking by hash/path is
expected (the Welcome tiles rely on it).

### Screen 1 — Dashboard
- **Stat row** (5 cards, equal grid): label / Spectral number / delta line (green up, red overdue,
  grey neutral). Cards are **clickable**: Total patients → Patients (all); In active treatment →
  Patients filtered "In treatment"; MDT pending → Patients filtered "MDT pending"; Follow-ups due →
  Patients filtered "Follow-up"; Custom modules → Module builder. Hover = card lift.
  Values: 241 / 63 / 7 / 12 / 5.
- **Registrations chart** (left, 1.5fr): 12 vertical bars (Jan–Dec heights
  40,52,47,60,55,72,64,80,70,88,76,95 %), current month (Dec) teal `#0C4F4E`, others `#9DC4C1`;
  caption "Last 12 months · 241 total". Bars grow on mount.
- **Diagnosis distribution** (right, 1fr): horizontal bars with label + mono %: Cervical 48% `#0C4F4E`,
  Ovarian 22% `#14807E`, Endometrial 16% `#7A3B5E`, Vulval/Vaginal 8% `#C98AAE`, GTD 6% `#D8B23A`.
  Each row **clickable** → Patients with search prefilled to that diagnosis term.
- **Recent patients** (left, 1.5fr): "View all →" (→ Patients) + 5 rows (avatar initials, name, mono
  id, diagnosis, "updated" relative time, status pill). Row click → that patient's record.
- **Tasks & alerts** (right, 1fr): 4 rows (colored icon chip + title + subtitle), **clickable**:
  MDT board → Patients (MDT pending); follow-ups overdue → Patients (Follow-up); drafts → Patients
  (all); Monthly export ready → Export screen.

### Screen 2 — Patients
- **Filter chips** row: All patients / In treatment / MDT pending / Follow-up (active = teal fill,
  white text). A right-aligned "＋ New patient" primary button → New patient.
- **Table card**: header row (Patient / Diagnosis / Stage / HIV / Status / Surgeon), then patient
  rows (grid `1.5fr 1fr .7fr .8fr 1fr 1fr`): avatar + name + mono "id · age", diagnosis, mono stage,
  HIV chip, status pill, surgeon. Row hover bg `#FBFAF6`; click → record. Footer: "Showing N of 241"
  + pager (1 active, 2, 3). Search box (topbar) and filter chips both narrow the list.

### Screen 3 — New patient registration (max-width 880px)
- Top line: live "● Draft auto-saved · {time}" (green pulse) and right "ID assigned: GYN-0242"
  (mono). Intro paragraph notes phone/email/address/emergency/next-of-kin are intentionally excluded
  per protocol (NOTE: a "Phone number · optional" field was later added to Identity at the client's
  request — keep it optional).
- Three section cards, each a 2-column field grid:
  - **Identity** ◉: Patient ID (readonly "GYN-0242"), Hospital number, National ID (optional),
    Date registered (readonly "29 Jun 2026"), First name, Surname, Phone number (optional).
  - **Demographics** ⌖: Date of birth (date picker), Age (readonly, auto-calculated from DOB),
    Province (select: Harare/Bulawayo/Manicaland/Mashonaland East/Masvingo/Midlands), District,
    Occupation, Marital status (select), Education (select).
  - **Clinical baseline** ✛: HIV status (select Negative/Positive/Unknown), ART status
    (On ART/Not on ART/N/A), CD4 count (cells/mm³), Viral load (copies/mL), ECOG score (0–4), BMI.
- Inputs: 44px tall, radius 10, border `#E2DDD3`, focus ring as above; readonly fields use bg
  `#F7F4EE` and muted text. Labels 12.5/600 with optional grey suffix.
- Actions: primary "Save & open record", outline "Save as draft", text "Cancel", right caption
  "All edits recorded in audit trail". Save shows a toast and navigates to a record.

### Screen 4 — Patient record
- **Header card**: large avatar, name (Spectral 24), mono meta "id · Hosp · age · diagnosis stage",
  status pill + HIV pill on the right.
- **Module tabs** (wrapping pill bar): the 11 modules (Registration, Referral, Diagnosis, Imaging,
  MDT, Surgery, Pathology, Treatment, Complications, Follow Up, Outcomes). Completed modules show a
  green ✓. Active tab = teal fill/white. Clicking a tab swaps the content panel.
- **Content panel**: module title (Spectral 19) + a contextual note + a 2-column key/value grid.
  Notable protocol notes baked into copy: Diagnosis "includes GTD, excludes GTN"; MDT "single
  pre-theatre discussion only"; Pathology "no tumour markers, no IHC section"; Registration "no
  phone/email/address/emergency/next-of-kin". (Field values are sample data.)
- **Right rail**: Audit trail (timeline: who + action + mono timestamp, colored node dots,
  connector line; "View full history" button) and a Completion card (progress bar "7 of 11 modules
  complete").

### Screen 5 — Module builder (dynamic, no-code)
Three columns: **Field-type palette** (220px): Text, Long text, Number, Date, Dropdown, Checkbox,
Radio, Boolean, File upload, Calculated — each click **appends** a field to the canvas.
**Canvas** (center): editable module-name (inline, Spectral 22), helper text, then the field list —
each field is a row with a drag handle ⠿, type icon chip, label, mono "type · required?", and a
remove ✕ (removes it). Empty state: dashed placeholder. **Save panel** (280px): two radio options —
"Permanent core module" (default; added to registry permanently, included in reporting/export) vs
"Temporary module" (this study only, archivable) — and a "Save module as core" button (toast on
save). Seeded example module "Recurrence tracking" with 3 fields.

### Screen 6 — Export & research (max-width 960px)
Left: **Export format** card — 6 selectable cards (Excel .xlsx, CSV .csv, PDF .pdf, SPSS .sav,
Stata .dta, JSON .json); selected = teal border + teal tint bg; caption shows matched record count.
**Bulk upload** card — dashed dropzone for historical Excel/CSV with a "Browse files" button and
"map columns after upload" note. Right: **Options** card — "De-identify for research" toggle
(custom switch; on = teal, knob slides), a summary list (Cohort / Records / Modules / Format), a
primary "Export N records · {Format}" button (toast: "Export queued · {Format}[ (de-identified)]"),
and an audit note.

### Screen 7 — Reports
Period toggle (Monthly / Annual; active teal) + "⤓ Generate PDF report" button. A 4-stat row
(New registrations / Surgeries / MDT cases / Deaths recorded — values switch with period). Two
cards: **Stage at diagnosis** (horizontal bars I 28% / II 31% / III 27% / IV 14%) and
**Outcomes summary** (Alive NED 54% green, Alive with disease 29% amber, Deceased 13% red, Lost to
follow-up 4% grey).

### Screen 8 — Admin
Left: **Roles & permissions** table (Role / View / Edit / Export with ✓/✕): Administrator (3),
Clinician (14), Data entry (8, no export), Researcher (6, no edit). Right: **Automated backups**
card (green "Healthy", "Last: 04:00 today", retention note) and **Recent system audit** card
(who + action + mono timestamp list).

---

## Interactions & Behavior (summary for implementation)
- **Navigation**: sidebar nav and all dashboard drill-downs change route (+ optional filter/search
  preset) and update the topbar title/subtitle. Welcome tiles deep-link into Registry by hash.
- **Search**: free-text filter over patient name, id, diagnosis, surgeon.
- **Filters**: status chips on Patients; dashboard cards/tasks set the same filter then navigate.
- **Forms**: registration captures all fields to state; DOB auto-computes Age; an auto-save
  timestamp updates on every edit; Save emits a toast naming the patient.
- **Module builder**: add/remove fields mutate a canvas array; save emits a toast.
- **Toggles**: export format selection, de-identify switch, report period — all reflect immediately.
- **Toasts**: bottom-center dark pill with green ✓, auto-dismiss ~2.6s.
- **States to support**: button loading spinners (auth), inline form errors, empty state (builder),
  hover/active on every clickable card/row/chip, focus rings on inputs.

## State Management
Auth (Welcome): `screen`, `username`, `password`, `remember`, `otp[6]`, `error`, `otpError`,
`loading`. App (Registry): `route`, `selectedPatient`, `search`, `filter`, `activeModule`,
`builderName`, `builderFields[]`, `selectedExportFormat`, `deidentify`, `reportPeriod`, `toast`,
`form{}` (registration values incl. computed `age`), `savedAt`. Replace the prototype's local state
with your app's state/store and wire real APIs for: auth + 2FA, patient CRUD, module schema CRUD,
search/filter queries, exports (Excel/CSV/PDF/SPSS/Stata/JSON + de-identified), bulk import, audit
log, reporting aggregates, role/permission checks, and automated backups.

## Assets
No raster images or external icons — all icons are Unicode glyphs and simple CSS/box marks (the
logo is a CSS ring with a dot). Replace glyphs with your icon library's equivalents
(search, plus, gear, download, grid, table, shield, lock, drag-handle, check, close, etc.).
Fonts: Spectral, IBM Plex Sans, IBM Plex Mono (Google Fonts).

## Files
- `Welcome.dc.html` — authentication flow design reference.
- `Registry.dc.html` — full application design reference (all 8 screens + shell).
- `support.js` — prototype runtime ONLY (do not port). Included so the HTML opens in a browser.

To preview: open either `.html` in a browser. Welcome demo creds: any username + password
`registry`, then OTP `000000`. Or open `Registry.dc.html#<route>` directly.
