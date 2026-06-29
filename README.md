# Zimbabwe Gynaecological Oncology Registry

Prospective gyn oncology registry aligned with ESGO/SGO-style modules for Parirenyatwa and research use (UZ, IARC collaborations).

## Modules (13)

1. **Demographics** — hospital #, national ID, province, HIV/ART, ECOG, BMI  
2. **Referral & delays** — symptom → diagnosis → treatment dates (auto delay calculations)  
3. **Diagnosis** — cancer site, histology, grade, FIGO, MDT  
4. **Imaging** — ultrasound/CT/MRI/PET, PCI, tumour size  
5. **Surgery** — multiple records, approach, CC score, cytoreduction  
6. **Histopathology** — nodes, LVSI, molecular markers (p53, MMR, BRCA, HRD, CA125, HE4)  
7. **Chemotherapy** — regimens, cycles, toxicity  
8. **Radiotherapy** — EBRT, brachytherapy, completion  
9. **Complications** — Clavien-Dindo, 30/90-day mortality  
10. **Follow-up** — disease status, ECOG per visit  
11. **Recurrence** — site, biopsy, treatment  
12. **Survival** — OS, PFS, DFS (auto-calculated)  
13. **Research / biobank** — consent, tissue, genetics  

All dropdown fields use **numeric codes** (REDCap-style) for SPSS/Stata/R export.

## Quick start

```bash
cd ~/Projects/obgyn-registry
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Visit **http://localhost:3000/setup** if users are missing, then **http://localhost:3000/login**.

> **PostgreSQL required** — use a free [Neon](https://neon.tech) database. Copy `.env.example` to `.env` and set `DATABASE_URL`.

> **Deploy online for Dr. Guzha?** See **[DEPLOY.md](./DEPLOY.md)** (Vercel + Neon, ~15 min).

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@registry.local | Admin123! |
| Clinician (Dr. Guzha) | clinician@registry.local | Clinician123! |
| Researcher | researcher@registry.local | Research123! |

## Research access

1. Sign in as **Researcher** (or Admin)  
2. Go to **Reports & Export** (`/reports`)  
3. Download **de-identified CSV** — includes coded variables + auto delays and survival days  

## Dashboard indicators

- New cases/month, median diagnosis & treatment delay  
- Cervical FIGO distribution, cancer site breakdown  
- CC-0 rate (ovarian), chemo/RT completion, recurrence, 30-day mortality  

## Code reference

Cancer type: 1=Cervix, 2=Ovary, 3=Endometrium, 4=Vulva, 5=Vagina, 6=GTD  
Full codes in `src/lib/codes.ts`.
