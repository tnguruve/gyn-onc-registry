#!/bin/bash
# One-shot deploy for Zimbabwe Gyn Onc Registry
set -e
cd "$(dirname "$0")"

echo "=== Gyn Onc Registry — Vercel deploy ==="
echo ""

if ! command -v vercel &>/dev/null; then
  echo "Install Vercel CLI: npm i -g vercel"
  exit 1
fi

if ! vercel whoami &>/dev/null; then
  echo "Log in to Vercel (browser will open)..."
  vercel login
fi

echo ""
echo "You need a PostgreSQL URL from https://neon.tech (free)."
echo "Create a project there, copy the connection string, then paste it below."
echo ""
read -r -p "DATABASE_URL: " DATABASE_URL
read -r -p "AUTH_SECRET (press Enter to auto-generate): " AUTH_SECRET

if [ -z "$AUTH_SECRET" ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  echo "Generated AUTH_SECRET"
fi

echo ""
echo "Deploying to Vercel..."
vercel --yes \
  -e "DATABASE_URL=$DATABASE_URL" \
  -e "AUTH_SECRET=$AUTH_SECRET" \
  -e "NODE_ENV=production"

URL=$(vercel ls 2>/dev/null | head -5 || true)
echo ""
echo "=== Next step ==="
echo "1. Copy your deployment URL from above (or Vercel dashboard)"
echo "2. Set NEXT_PUBLIC_APP_URL to that URL in Vercel → Settings → Environment Variables"
echo "3. Run: vercel --prod"
echo ""
echo "Share with Dr. Guzha:"
echo "  URL:      https://YOUR-APP.vercel.app/login"
echo "  Email:    clinician@registry.local"
echo "  Password: Clinician123!"
