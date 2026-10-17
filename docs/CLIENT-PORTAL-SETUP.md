# Client portal setup (Supabase + Netlify)

The login pages (`/signup`, `/login`, `/forgot-password`, `/reset-password`, `/account`) are
already built. Until you finish these steps they show "The client login isn't switched on yet".
Allow about 30–40 minutes. Do the steps in order.

> **Two keys, one rule.** Supabase gives you a public **anon** key and a secret
> **service_role** key. Only the anon key ever goes into Netlify. Never paste the
> service_role key anywhere in this project. The build refuses to run if you try.

---

## 1. Create the Supabase project (free tier)

1. Go to <https://supabase.com>, sign up (use your Google account) and click **New project**.
2. Name: `upward-web`. Database password: generate one and save it in your password manager.
   Region: **South Asia (Mumbai)**. Plan: **Free**. Click **Create new project** and wait ~2 minutes.

## 2. Create the projects table (copy–paste, one click)

1. Left menu → **SQL Editor** → **New query**.
2. Open `docs/supabase/setup.sql` from this repository, copy all of it, paste it in and click **Run**.
   You should see "Success. No rows returned".
3. Left menu → **Table Editor** → you now have a table **client_projects**, with
   Row Level Security switched **on** (the shield icon). Leave it on.

## 3. Login settings

Left menu → **Authentication**:

1. **Sign In / Providers → Email**: make sure **Enable Email provider** and **Confirm email** are ON.
   Set **Minimum password length** to **8**. Save.
2. **URL Configuration**:
   - **Site URL**: `https://harnoorsingh.in`
   - **Redirect URLs** → Add each of these:
     - `https://harnoorsingh.in/account`
     - `https://harnoorsingh.in/reset-password`
3. **Emails** (optional but recommended): edit the "Confirm signup" and "Reset password" templates
   so they say *Upward Web by Harnoor Singh*. The free tier only sends a few emails per hour from
   Supabase's own address; for real clients, connect your own email under **Emails → SMTP Settings**
   (e.g. a free Brevo or Zoho Mail account).

## 4. "Continue with Google"

1. Go to <https://console.cloud.google.com>, create a project called `Upward Web`.
2. **APIs & Services → OAuth consent screen**: User type **External**. App name `Upward Web`,
   support email `harnoor459456@gmail.com`, app domain `https://harnoorsingh.in`,
   privacy policy `https://harnoorsingh.in/privacy-policy`, terms `https://harnoorsingh.in/terms`.
   Scopes: leave the defaults (email, profile, openid). Publish the app when you're ready.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorised JavaScript origins: `https://harnoorsingh.in`
   - Authorised redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (copy the exact address from Supabase → Authentication → Sign In / Providers → Google)
4. Copy the **Client ID** and **Client secret** into Supabase → Authentication →
   Sign In / Providers → **Google**, switch it on and save. (The Google client secret stays in
   Supabase only. It never goes into Netlify or this repository.)

## 5. Connect the website (Netlify environment variables)

1. In Supabase: **Project Settings → API**. Copy:
   - **Project URL** (looks like `https://abcdefghijklm.supabase.co`)
   - the **anon / public** key (or the new **publishable** key that starts with `sb_publishable_`)
2. In Netlify: your site → **Site configuration → Environment variables → Add a variable**:

   | Key | Value | Scopes |
   |---|---|---|
   | `SUPABASE_URL` | your Project URL | All (or Builds) |
   | `SUPABASE_ANON_KEY` | the anon / publishable key | All (or Builds) |

3. **Deploys → Trigger deploy → Deploy site**. The build step (`node scripts/build-config.mjs`)
   writes these into `js/supabase-config.js`. Check the deploy log for
   `build-config: wrote js/supabase-config.js for https://….supabase.co`.

Nothing else needs a key. Do **not** add the service_role key, the database password or the
Google client secret to Netlify.

## 6. Test it yourself (5 minutes)

1. Open `https://harnoorsingh.in/signup` in a private window, sign up with a second email address
   you own, tick the Terms box, and submit. You should see "Check your email".
2. Open the email, click the link → you land on `/account` ("I haven't set up your project yet").
3. In Supabase → **Table Editor → client_projects**, find the new row and fill in
   `project_name`, `status` (Not started / Designing / In review / Live) and `notes`. Save.
4. Refresh `/account`: you see the project, the status bar and your notes. The header says **My account**.
5. Click **Log out**, then **Forgot your password?** → request a reset link → choose a new password → log in.
6. Try **Continue with Google** on `/login`.

## Updating a client's project later

Supabase → **Table Editor → client_projects** → click the client's row → change
`project_name`, `status` or `notes` → **Save**. The client sees it next time they open `/account`.
Clients can only ever read their own row; they can't change anything.

## Deleting a client's account (e.g. when asked under the privacy policy)

Supabase → **Authentication → Users** → the user → **Delete user**. Their `client_projects` row is
deleted automatically.
