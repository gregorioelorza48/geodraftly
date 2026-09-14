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

## Production notes

1. Change the Prisma datasource `provider` to `postgresql`.
2. Point `DATABASE_URL` at managed Postgres.
3. Set a long random `SESSION_SECRET`.
4. Put files on S3 or R2.
5. Deploy the Next app to Vercel.

Auth is email/password with org membership checks on every query. Swap the session layer for Clerk later if you want SSO and hosted org management — the `Organization` / `OrganizationMember` models already match that shape.
