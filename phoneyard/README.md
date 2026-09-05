# Phoneyard 2.0

A three-portal mobile-phone marketplace built with React, Vite, Tailwind CSS, Node.js and Supabase.

## Portals
- `/` public buyer portal
- `/owner/login` vendor authentication; `/owner/*` vendor workspace
- `/admin/login` administrator authentication; `/admin/*` executive dashboard

## Setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. `npm install`
5. `npm run dev`

The vendor listing uploader compresses images client-side to WebP before sending them to the `phoneyard` Storage bucket.

## Security
Do not put a Supabase service-role key in Vite/browser code. Admin-sensitive operations such as exports, privileged configuration, and irreversible maintenance actions should run through trusted server/Edge Function code. RLS is included in the schema and must remain enabled.
