# OmniAdmin

A standalone, unified admin panel for managing **Shudhham**, **Houserve**, and **BuildKart** from one place.

## Architecture

```
Browser → Next.js (API Routes / Server Components)
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
Shudhham   Houserve   BuildKart
Supabase   Supabase   Supabase
(service   (service   (service
 role)      role)      role)
```

**Key security property:** The browser never directly queries any of the three project databases. All reads and writes go through Next.js Server Components or Route Handlers, which hold the service-role keys server-side.

## Quick Start

### 1. Create a new Supabase project for the admin app

Go to [supabase.com](https://supabase.com) → New project. This project holds **only** admin auth — no business data.

Run `scripts/admin-setup.sql` in that project's SQL Editor.

Then create your first super admin:
1. Authentication → Users → Add User (email + password)
2. Copy the UUID
3. Run in SQL Editor:
```sql
INSERT INTO public.admin_profiles (id, full_name, role)
VALUES ('your-uuid-here', 'Your Name', 'super_admin');
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Fill in all values — see .env.example for instructions
```

Required keys you need to supply from dashboards:
| Key | Where to find it |
|---|---|
| `NEXT_PUBLIC_ADMIN_SUPABASE_URL` | New admin project → Settings → API |
| `NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY` | New admin project → Settings → API |
| `ADMIN_SUPABASE_SERVICE_ROLE_KEY` | New admin project → Settings → API |
| `SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY` | Shudhham project → Settings → API |
| `SHUDHHAM_STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys |
| `HOUSERVE_SUPABASE_SERVICE_ROLE_KEY` | Houserve project → Settings → API |
| `HOUSERVE_RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account Settings → API Keys |
| `BUILDKART_SUPABASE_SERVICE_ROLE_KEY` | BuildKart project → Settings → API |
| `BUILDKART_RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account Settings → API Keys |

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

## Admin Roles

| Role | Access |
|---|---|
| `super_admin` | All three workspaces |
| `shudhham_admin` | Shudhham only |
| `houserve_admin` | Houserve only |
| `buildkart_admin` | BuildKart only |

To change a user's role:
```sql
-- Run in the admin Supabase project's SQL Editor
UPDATE admin_profiles SET role = 'houserve_admin' WHERE id = 'user-uuid';
```

## Security Notes

- The browser **never** makes direct requests to `*.supabase.co` for business data. All queries go through Next.js server routes.
- Service role keys are server-only (`ADMIN_SUPABASE_SERVICE_ROLE_KEY`, `SHUDHHAM_SUPABASE_SERVICE_ROLE_KEY`, etc.) — they are not prefixed with `NEXT_PUBLIC_` and are never sent to the client.
- Admin sessions are managed by Supabase Auth on the dedicated admin project, not by any of the three product databases.

## Adding a Fourth Project

1. Add env vars to `.env.example` and `.env.local`:
   ```
   NEWPROJECT_SUPABASE_URL=...
   NEWPROJECT_SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. Create `src/lib/supabase/newproject.ts` (copy `houserve.ts`, adjust types).
3. Create `src/integrations/newproject/queries.ts`.
4. Add a new entry to `WORKSPACES` in `src/lib/workspace.ts` — sidebar and switcher auto-generate.
5. Create `src/app/(dashboard)/[workspace]/page.tsx` (the existing file handles it via `workspace` param branching).
6. Add the new role `newproject_admin` to the `CHECK` constraint in `scripts/admin-setup.sql`.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Data fetching | TanStack Query v5 (client) + Server Components (server) |
| Admin auth | Supabase Auth (dedicated admin project) |
| Business DBs | Supabase JS v2 (service role, server-only) |
| Charts | Recharts |
| Dark mode | next-themes |
| Command palette | cmdk |
| State | Zustand |
