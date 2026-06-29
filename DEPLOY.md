# Deploy online (show Dr. Guzha a live link)

Use **Vercel** (hosting) + **Neon** (free PostgreSQL). Takes about 15 minutes.

## 1. Push code to GitHub

```bash
cd ~/Projects/obgyn-registry
git init   # if not already a repo for this project
git add .
git commit -m "Gyn oncology registry — demo deploy"
```

Create a new repo on GitHub (e.g. `gyn-onc-registry`), then:

```bash
git remote add demo https://github.com/YOUR_USERNAME/gyn-onc-registry.git
git push -u demo main
```

## 2. Create a PostgreSQL database (Neon)

1. Go to [https://neon.tech](https://neon.tech) and sign up (free).
2. Create a project — pick a region close to Zimbabwe if available (e.g. **EU** or **Singapore** for demo latency).
3. Copy the **connection string** (starts with `postgresql://...`).

## 3. Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → import your `gyn-onc-registry` repo.
3. Under **Environment Variables**, add:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Your Neon connection string |
| `AUTH_SECRET` | Long random string (run `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Leave blank for first deploy; set to your Vercel URL after deploy |
| `SETUP_SECRET` | Another random string (optional; for `/setup` in production) |

4. Click **Deploy**.

The build runs `prisma db push` and seeds **Dr. Guzha** + demo patient **GYN0001** automatically.

## 4. After first deploy

1. Copy your live URL, e.g. `https://gyn-onc-registry.vercel.app`
2. In Vercel → **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_APP_URL` = `https://gyn-onc-registry.vercel.app`
3. **Redeploy** once.

## 5. Share with Dr. Guzha

Send him:

- **Link:** `https://your-app.vercel.app/login`
- **Login:** `clinician@registry.local`
- **Password:** `Clinician123!`

He will see **Dr. Guzha** in the header and can open **GYN0001 — Moyo, Tariro** for the full demo.

### Optional logins

| Role | Email | Password |
|------|-------|----------|
| Clinician | clinician@registry.local | Clinician123! |
| Researcher (export) | researcher@registry.local | Research123! |
| Admin | admin@registry.local | Admin123! |

## Production notes (Zimbabwe)

- This demo uses Neon/Vercel (good for a **preview**).
- For real patient data, move to **AWS Cape Town (`af-south-1`)** or **Azure Johannesburg** with PostgreSQL, signed agreements, and POTRAZ/CDPA compliance.
- Change default passwords before any real clinical use.

## Local dev after PostgreSQL switch

Local development now needs PostgreSQL (SQLite is no longer used). Easiest: use the same Neon connection string in `.env`:

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="local-dev-secret"
npm install
npm run dev
```

Or run `/setup` at `http://localhost:3000/setup` if the database is empty.
