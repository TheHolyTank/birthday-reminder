# Birthday Reminder

A small multi-user Next.js app: each account tracks their own friends'
birthdays, and every day it checks whose birthday is tomorrow and sends
**them** a Telegram message reminding them to send their regards.

- Frontend + API: Next.js (App Router), deployed on Vercel
- Database: Vercel Postgres (Neon-backed, free tier)
- Daily check: Vercel Cron, once a day
- Message send: Telegram Bot API (free, official, reliable) — one shared bot,
  each account supplies its own chat id
- Accounts: email + password, sign-up gated by a shared invite code

## 1. Create a Telegram bot

1. In Telegram, open a chat with **@BotFather**.
2. Send `/newbot` and follow the prompts (pick any name and username for it).
3. BotFather replies with a **token** that looks like `123456789:AAExampleTokenHere`. Save it — this goes into Vercel's env vars in step 3 (one bot token for the whole app; every account's reminders route through it).

Each *user* (not just the deployer) will later message this same bot themselves and get their own chat id from **@userinfobot** — that's covered in step 5, it's an in-app setting, not something you configure per-deploy.

## 2. Push this project to GitHub

```powershell
git init
git add .
git commit -m "Initial commit"
```

Then create a new (private, if you like) repo on GitHub and push this folder to it.

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign up/log in, and click **Add New → Project**.
2. Import the GitHub repo you just pushed.
3. Go to the project's **Storage** tab → **Create Database** → **Marketplace
   Database Providers** → **Neon** (free tier), and connect it to this
   project. The integration automatically adds the `POSTGRES_URL` env var
   this app reads.
4. Go to **Environment Variables** and add:
   - `TELEGRAM_BOT_TOKEN` — the token from step 1.
   - `CRON_SECRET` — any random string you make up. Vercel automatically sends
     this as a bearer token when it triggers the daily cron. **Required** — if
     unset, the cron endpoint refuses all requests.
   - `SITE_PASSWORD` — a shared **invite code**. Anyone who knows it can create
     an account at `/signup`; this isn't a public sign-up product, it's a
     private app you control access to. **Required**.
   - `AUTH_SECRET` — any random string (e.g. `openssl rand -base64 32`), signs
     session cookies. **Required**. Rotating it logs everyone out everywhere.
5. Redeploy.

Your site will be live at `https://<your-project>.vercel.app`.

## 4. Set the reminder time

By default, [vercel.json](vercel.json) runs the check daily at **17:30 UTC**
(20:30 Israel Daylight Time). Vercel's free (Hobby) plan only supports fixed
UTC cron schedules with no daylight-saving awareness, so this drifts to
19:30 local during Israel Standard Time (roughly late October–late March) —
shift it by one hour for that half of the year if you want to keep it exact:

```json
"schedule": "30 17 * * *"
```

(minute hour * * *). Redeploy after changing it. Since accounts can be in
different timezones, this one schedule is shared by everyone — there's no
per-user reminder time (yet).

## 5. Use it

1. Visit your Vercel URL and go to **Sign up**. Create an account with your
   email, a password, and the `SITE_PASSWORD` invite code from step 3.
   **If you're upgrading an existing single-user deployment**, the very first
   account ever created automatically inherits all previously-added
   friends/groups — nothing is lost, you're just "claiming" it once.
2. Open **⚙ Telegram settings** in the app, message **@userinfobot** on
   Telegram to get your numeric chat id, and paste it in. Reminders won't send
   until this is set.
3. Add friends with their name, birthday, and an optional note. The night
   before each birthday, you'll get a Telegram message like:

   > 🎂 Reminder: it's Jane's (college roommate) birthday tomorrow, August 3! Don't forget to send your regards.

Anyone else you share the invite code with can sign up for their own account,
with their own friends, groups, and Telegram chat id — completely separate
from yours.

## Local development

Requires [Node.js](https://nodejs.org) (LTS) installed.

```powershell
npm install
vercel env pull .env.local   # after linking the project with `vercel link`
npm run dev
```

`SITE_PASSWORD`, `AUTH_SECRET`, and `CRON_SECRET` must all be set in
`.env.local` too. The only paths that don't require being logged in are
`/login`, `/signup`, `/api/login`, `/api/signup`, `/api/logout`, and
`/api/cron/check-birthdays` (which has its own bearer-token check instead).

You can manually trigger the birthday check locally or in prod by visiting
`/api/cron/check-birthdays` with an `Authorization: Bearer <CRON_SECRET>`
header.
