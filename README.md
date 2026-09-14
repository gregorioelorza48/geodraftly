# Geodraftly

Field operations and site documentation for small-to-medium engineering and landscape architecture firms.

**Turn every site visit into a complete project record.**

## What this is

A Next.js app for:

- Firm and project setup
- Site visits (date, observer, weather, notes)
- Observations with categories, photos, GPS, and map pins
- Punch lists and follow-up tasks
- Professional PDF site observation reports

The previous Express drawing-revision scaffold in this folder has been replaced. CAD sheet revisions remain a planned later phase (plan overlays / markup), not part of this MVP.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite locally (PostgreSQL is the production target)
- Session cookies (signed JWT)
- Local `uploads/` storage, or S3/R2 when credentials are present
- Leaflet maps (Mapbox tiles when `NEXT_PUBLIC_MAPBOX_TOKEN` is set)
- Server-side PDF generation with pdf-lib

## Run locally

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo account:

- Email: `demo@geodraftly.app`
- Password: `demo1234`

## Environment

See `.env.example`. Local defaults live in `.env`:

- `DATABASE_URL=file:./dev.db`
- `SESSION_SECRET` — change before any real deployment

Optional:

- S3/R2 credentials for photo and report storage
- `NEXT_PUBLIC_MAPBOX_TOKEN` for Mapbox light tiles
- `NEXT_PUBLIC_REVENUECAT_API_KEY` for subscriptions (Web Billing public `rcb_` key)

## Billing (RevenueCat)

Subscriptions are firm-scoped: the App User ID is `org_<organizationId>`, so everyone in the firm shares one plan. Open **Billing** in the sidebar (or Plans & billing on the workbench).

Without a public key the app stays free to use and `/billing` shows setup steps. With a key, the page loads the current offering and checkout from [purchases-js](https://www.revenuecat.com/docs/web/web-billing/web-sdk).

Dashboard setup:

1. Create a project at [app.revenuecat.com](https://app.revenuecat.com).
2. Connect Stripe (RevenueCat Billing) or Paddle, then create a Web Billing app.
3. Add products, an offering, and an entitlement (`pro` by default, or set `NEXT_PUBLIC_REVENUECAT_ENTITLEMENT`).
4. Paste the Web Billing **public** API key into `NEXT_PUBLIC_REVENUECAT_API_KEY`. Sandbox keys start with `rcb_sb_`.

## Deploy on Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New** → **Blueprint** → pick the `geodraftly` repo (uses `render.yaml`). Apply. That creates the web app and a Postgres database and sets `DATABASE_URL` plus `SESSION_SECRET` for you.
3. Wait until the service is **Live**. Open the `.onrender.com` URL.
4. Sign in with `demo@geodraftly.app` / `demo1234`.

Manual setup (no Blueprint): **New** → **Web Service** → `geodraftly`. Build `npm install && npm run build`, start `npm start`. Then **New** → **PostgreSQL**. On the web service **Environment**, add `DATABASE_URL` = the database **Internal Database URL**, and `SESSION_SECRET` = a long random string. Seed once from the web service **Shell**: `npm run db:seed`.

Local `npm run dev` still uses SQLite.

Auth is email/password with org membership checks on every query. Swap the session layer for Clerk later if you want SSO and hosted org management — the `Organization` / `OrganizationMember` models already match that shape.
