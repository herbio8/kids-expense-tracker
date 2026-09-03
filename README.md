# Kids expense tracker

Next.js + Supabase app for tracking education and aftercare expenses,
with reimbursement tracking and receipt uploads. Free to run at
household scale.

## Stack
- **Frontend/hosting:** Next.js on Vercel (free tier)
- **Database + Auth + File storage:** Supabase (free tier)

## 1. Supabase setup

1. Create a project at https://supabase.com (free tier).
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`.
   This creates the `expenses` table, its security policies, and the
   `receipts` storage bucket policies.
3. Go to **Storage** and confirm a `receipts` bucket exists (the SQL
   script creates it, but you can also create it manually — mark it
   **private**, not public).
4. Go to **Authentication -> Users** and manually add two users: you
   and your wife (email + password). There's no public sign-up page
   in this app on purpose — you don't want strangers logging into
   your family's expense tracker.
5. Go to **Settings -> API** and copy:
   - Project URL
   - `anon` public key

## 2. Run locally

```bash
git clone <your-repo-url>
cd kids-expense-tracker
npm install
cp .env.local.example .env.local
# paste your Supabase URL + anon key into .env.local
npm run dev
```

Visit http://localhost:3000 and sign in with one of the users you
created in Supabase.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create kids-expense-tracker --private --source=. --push
# or manually create a private repo on github.com and:
# git remote add origin <your-repo-url>
# git push -u origin main
```

## 4. Deploy to Vercel

1. Go to https://vercel.com, sign in with GitHub.
2. **Add New Project** -> import your `kids-expense-tracker` repo.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel gives you a `https://your-app.vercel.app` URL and
   auto-redeploys on every push to `main`.
5. On your phone, open that URL in Safari/Chrome and use
   "Add to Home Screen" so it behaves like an installed app.

## Data model

`expenses` table:

| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| date | date | |
| amount | numeric | |
| category | text | `Education` or `Aftercare` |
| kid_name | text | |
| notes | text | |
| added_by | uuid | references the logged-in user |
| reimbursement_requested | boolean | |
| reimbursement_date | date | set automatically when marked reimbursed |
| receipt_url | text | storage **path**, not a public URL (bucket is private, so the app generates a short-lived signed link on demand when you click "Receipt") |

## Extending it later

- Add a monthly/yearly chart (Supabase query + a chart library).
- CSV export for tax season.
- Push notifications when your spouse adds an expense.
- Multiple kids as a proper table instead of a free-text name, if you
  want per-kid reporting.

## Costs at this scale

Both Supabase and Vercel free tiers comfortably cover a two-person
household app indefinitely — you'd need heavy, unusual usage to hit
their limits. If you ever want a custom domain instead of
`.vercel.app`, that's the only real cost (~$10-15/year).
