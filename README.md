# Birthday Reminder

A small Next.js app: add friends' birthdays, and every day it checks whether
anyone's birthday is tomorrow and sends **you** a WhatsApp message reminding
you to send your regards.

- Frontend + API: Next.js (App Router), deployed on Vercel
- Database: Vercel Postgres (free tier)
- Daily check: Vercel Cron, once a day
- WhatsApp send: [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) (free, personal use)

## 1. Get a CallMeBot API key (sends messages to YOUR WhatsApp)

1. Add this contact to your phone: **+34 644 44 20 45** (CallMeBot's number).
2. Send it this exact WhatsApp message: `I allow callmebot to send me messages`
3. Wait for a reply with your personal API key (usually within a minute or two).
4. Note down:
   - Your WhatsApp number in international format, no `+`, no spaces (e.g. `15551234567`)
   - The API key CallMeBot sent you

You'll put both into Vercel's environment variables in step 3.

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
3. Before the first deploy finishes setting up, go to the project's **Storage** tab
   and create a new **Postgres** database (free tier), then connect it to this project.
   Vercel will automatically add the `POSTGRES_URL` env var for you.
4. Go to **Settings → Environment Variables** and add:
   - `CALLMEBOT_PHONE` — your WhatsApp number from step 1
   - `CALLMEBOT_APIKEY` — your CallMeBot API key from step 1
   - `CRON_SECRET` — any random string you make up (e.g. mash your keyboard). Vercel
     will automatically send this as a bearer token when it triggers the daily cron,
     which stops randoms on the internet from triggering your reminders.
5. Deploy.

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
note. The night before each birthday, you'll get a WhatsApp message like:

> 🎂 Reminder: it's Jane's (college roommate) birthday tomorrow, August 3! Don't forget to send your regards.

## Local development

Requires [Node.js](https://nodejs.org) (LTS) installed.

```powershell
npm install
vercel env pull .env.local   # after linking the project with `vercel link`
npm run dev
```

You can manually trigger the birthday check locally or in prod by visiting
`/api/cron/check-birthdays` (add the `Authorization: Bearer <CRON_SECRET>`
header if `CRON_SECRET` is set).
