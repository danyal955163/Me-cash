# Me Cash

Pakistan-based micro-task earning platform. Step 3 adds the dual Coins/Red Pocket wallet system, milestone exchange rules, referral rewards, notifications foundation, Supabase migrations, API routes and admin-panel route foundation.

## Local / Vercel setup

```bash
npm install
cp .env.example .env.local
# Set Supabase URL, anon key, service-role key (server-only), and ADMIN_EMAILS.
npm run dev
```

Connect this GitHub repository to Vercel with the root directory `/` and build command `npm run build`. Add the environment variables from `.env.example` in Vercel Project Settings. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Supabase

Run migrations in order:

```bash
supabase db push
# or paste supabase/migrations/001_initial.sql, 002_coins_red_pocket.sql,
# and 003_notifications_activity.sql in the Supabase SQL editor.
supabase db seed
```

The only hardcoded admin email is `muhammaddanyal4545@gmail.com`; the signup trigger promotes that email to admin and all other users to user. Set the admin password inside Supabase Auth rather than committing credentials.

## Currency rules

- 1,000 Coins = 1 Red Pocket = Rs. 1.
- Exchanges are exact milestones only: 200,000 / 500,000 / 1,000,000 Coins.
- Withdrawals come only from Red Pocket and require at least 200 RP.

## Referral rules

A referrer receives 500 Coins for each approved task completed by a referred user, plus 1 Red Pocket on every fifth task, for the first 30 tasks only. Duplicate task submissions are blocked by the database unique constraint.
