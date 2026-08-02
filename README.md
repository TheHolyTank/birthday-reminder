# Birthday Reminder

A small Next.js app: add friends' birthdays, and every day it checks whether
anyone's birthday is tomorrow and sends **you** a Telegram message reminding
you to send your regards.

- Frontend + API: Next.js (App Router), deployed on Vercel
- Database: Vercel Postgres (free tier)
- Daily check: Vercel Cron, once a day
- Message send: Telegram Bot API (free, official, reliable)

## 1. Create a Telegram bot and get your chat ID

1. In Telegram, open a chat with **@BotFather**.
2. Send `/newbot` and follow the prompts (pick any name and username for it).
3. BotFather replies with a **token** that looks like `123456789:AAExampleTokenHere`. Save it.
4. Now find your own numeric chat ID: open a chat with **@userinfobot** and send it any message. It replies with your **Id** (a number like `987654321`). Save it.
5. Open a chat with the bot you just created (search its username) and send it any message (e.g. "hi") — Telegram bots can't message you until you've messaged them first.

You now have two values: the bot token, and your chat ID. You'll put both into Vercel's environment variables in step 3.

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
   this app reads (Vercel's older native "Postgres" product has been retired
   in favor of this Neon-backed integration, but no code changes were needed).
4. Go to **Environment Variables** and add:
   - `TELEGRAM_BOT_TOKEN` — the token from step 1
   - `TELEGRAM_CHAT_ID` — your chat ID from step 1
   - `CRON_SECRET` — any random string you make up (e.g. mash your keyboard). Vercel
     will automatically send this as a bearer token when it triggers the daily cron,
     which stops randoms on the internet from triggering your reminders. **Required** —
     if unset, the cron endpoint refuses all requests rather than allowing anyone to
     trigger it.
   - `SITE_PASSWORD` — any password you choose. The whole app is gated behind a
     `/login` page that checks this password; you'll log in once and stay signed
     in for 30 days. **Required** — without it, `/login` can't succeed.
5. Redeploy.

Your site will be live at `https://<your-project>.vercel.app`.

## 4. Set the reminder time

By default, [vercel.json](vercel.json) runs the check daily at **17:00 UTC**.
Vercel's free (Hobby) plan only supports UTC cron schedules, so convert your
preferred local time to UTC and edit the `schedule` field, e.g.:

```json
"schedule": "0 17 * * *"
```

(minute hour * * *). Redeploy after changing it.

## 5. Use it

Open your Vercel URL, add friends with their name, birthday, and an optional
note. The night before each birthday, you'll get a Telegram message like:

> 🎂 Reminder: it's Jane's (college roommate) birthday tomorrow, August 3! Don't forget to send your regards.

## Local development

Requires [Node.js](https://nodejs.org) (LTS) installed.

```powershell
npm install
vercel env pull .env.local   # after linking the project with `vercel link`
npm run dev
```

`SITE_PASSWORD` and `CRON_SECRET` must be set in `.env.local` too (the app is
gated by design — if either is missing, you won't be able to log in or run
the cron check locally). The only paths that don't require being logged in
are `/login`, `/api/login`, `/api/logout`, and `/api/cron/check-birthdays`
(which has its own bearer-token check instead).

You can manually trigger the birthday check locally or in prod by visiting
`/api/cron/check-birthdays` with an `Authorization: Bearer <CRON_SECRET>`
header.
