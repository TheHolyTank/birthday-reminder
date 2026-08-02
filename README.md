# Birthday Reminder

A small multi-user Next.js app: each account tracks their own friends'
birthdays, and sends **them** a Telegram message reminding them to send
their regards — the day before or the day of, at whatever hour they choose.

- Frontend + API: Next.js (App Router), deployed on Vercel
- Database: Vercel Postgres (Neon-backed, free tier)
- Reminder check: Vercel Cron + a free external hourly pinger (see step 4)
- Message send: Telegram Bot API (free, official, reliable) — one shared bot,
  each account supplies its own chat id
- Accounts: username (Hebrew or Latin letters) + password, sign-up gated by
  a shared invite code

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

## 4. Reminder timing

Each account chooses its own reminder timing in **⚙ Settings**: whether to
be notified the **day before** or the **day of** each friend's birthday, and
at what hour — shown and picked in *your own local time*. This is
per-account, not a single global setting.

Under the hood this stores your chosen hour **and** your current UTC offset
(captured automatically from your browser each time you save), and both are
used together to work out "what date and hour is it for you right now."
Storing only a pre-converted UTC hour isn't enough — anyone not in UTC has
a calendar date that rolls over locally before (or after) UTC's own date
does, so date-matching against UTC's date alone silently misses part of the
day. One consequence: the stored offset is a plain fixed number, not a full
timezone, so it goes stale across a daylight-saving transition until you
next open Settings and save again (which refreshes it).

**Important — this needs one extra piece to actually be accurate.** Vercel's
free (Hobby) plan only triggers its own built-in cron (`vercel.json`) **once
a day**, and even then within a roughly ±1 hour window, not the exact minute.
So the endpoint needs to be checked more often than that for everyone's
individual hour choice to actually fire on time. The fix is free and takes
about 5 minutes:

1. Sign up free at [cron-job.org](https://cron-job.org) (or any similar free
   cron-ping service).
2. Create a new cron job:
   - **URL**: `https://<your-project>.vercel.app/api/cron/check-birthdays?secret=<your CRON_SECRET value>`
     (the secret goes right in the URL — no need to hunt for a custom-headers
     section. If your chosen service *does* support custom headers and
     you'd rather not put the secret in a URL that might get logged
     somewhere, you can instead use the URL without `?secret=...` and add a
     header `Authorization: Bearer <your CRON_SECRET value>`. Either works.)
   - **Schedule**: every hour, on the hour.
   - **Method**: GET
   - Leave any "HTTP authentication" (username/password) option **off** —
     that's a different, unrelated mechanism (HTTP Basic Auth).
3. Save and enable it.

With that running hourly, the endpoint is checked every hour and only
actually sends to accounts whose chosen day+hour matches *that* hour — so
each person's own setting is honored precisely, no matter what they picked.
`vercel.json`'s own daily trigger still runs too, as a redundant fallback in
case the external pinger ever goes down (it defaults to 17:30 UTC —
change the `schedule` field there if you want the fallback to land near a
particular time, though with the hourly pinger in place this fallback rarely
matters).

## 5. Use it

1. Visit your Vercel URL and go to **Sign up**. It's two steps:
   - **Step 1**: username, password, confirm password, and the `SITE_PASSWORD`
     invite code from step 3. **If you're upgrading an existing single-user
     deployment**, the very first account ever created automatically inherits
     all previously-added friends/groups — nothing is lost, you're just
     "claiming" it once.
   - **Step 2 (required)**: the page walks through connecting Telegram —
     first message the app's own reminder bot (linked by name, looked up
     automatically via Telegram's API) with anything, e.g. "hi". **This step
     is easy to miss but required**: Telegram bots can't message you until
     you've messaged them first, so skipping it means reminders (and the
     verification code itself) can never be delivered. Then message
     **@userinfobot** to get your numeric chat id, enter it, and click **Send
     verification code**. The bot replies with a 6-digit code — enter it back
     in the app to confirm. You can't reach the main app until this is
     verified (it proves the chat id actually belongs to you, not just that
     you typed a number that happened to be someone else's). Note: this is
     only enforced during the sign-up flow itself — an account that's already
     created and logged in isn't re-blocked from the app if Telegram is ever
     disconnected later.
2. Open **⚙ Settings** (next to "Log out") any time afterward to upload a
   profile photo, change your username, change your password,
   reconnect/change your Telegram chat id, or set your **reminder timing**
   (day before/day of, and what hour in your own local time).
3. Add friends with their name, birthday, and an optional note. At your
   chosen time, you'll get a Telegram message like:

   > 🎂 Reminder: it's Jane's (college roommate) birthday tomorrow, August 3! Don't forget to send your regards.

   (or "...birthday today, August 3!" if you chose day-of instead of day-before)

Anyone else you share the invite code with can sign up for their own account,
with their own friends, groups, and Telegram chat id — completely separate
from yours.

**Admin:** the very first account ever created (yours, if you're the
deployer) is automatically the admin. A **🛡 Admin** link appears next to
"Log out" for that account only, showing every signed-up user (username,
Telegram-connected status, join date) with the ability to reset anyone's
password or delete their account entirely (including all their friends and
groups). There's currently no way to promote a second account to admin.

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
