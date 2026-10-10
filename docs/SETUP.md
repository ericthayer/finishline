# Setup: accounts Finishline needs

Three things only the owner can create. None of the values below are secrets except where marked; secrets go into Supabase or Netlify settings, never into the repo.

## 1. Supabase project

1. Create a project (free tier is fine to start; see SPEC §8 on the inactivity pause).
2. Apply the schema: `supabase link --project-ref <ref>` then `supabase db push` (applies `supabase/migrations/`).
3. Copy **Project URL** and **publishable key** into `.env.local` (see `.env.example`) and into Netlify env vars.

## 2. GitHub App (decided 2026-10-10: GitHub App, not OAuth App)

GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.

| Setting | Value |
|---|---|
| Name | `Finishline (<your handle>)` |
| Homepage URL | Netlify site URL |
| Callback URL | `https://<supabase-ref>.supabase.co/auth/v1/callback` |
| Request user authorization (OAuth) during installation | On |
| Webhook URL | `https://<supabase-ref>.supabase.co/functions/v1/github-webhook` (Phase 3) |
| Webhook secret | Generate; store in Supabase function secrets as `GITHUB_WEBHOOK_SECRET` (**secret**) |
| Repository permissions | Metadata: Read · Contents: Read · Issues: Read · Pull requests: Read |
| Account permissions | Email addresses: Read |
| Subscribe to events | Push, Pull request, Issues, Installation target |
| Where can this App be installed | Only on this account |

Then:
- Generate a **private key**; store it in Supabase function secrets as `GITHUB_APP_PRIVATE_KEY` (**secret**), with `GITHUB_APP_ID`.
- In Supabase → Authentication → Providers → GitHub, paste the App's **Client ID** and **Client secret** (**secret**).

## 3. Netlify site

Connect the repo, build command `npm run build`, publish directory `dist`, and set the two `VITE_SUPABASE_*` env vars.
