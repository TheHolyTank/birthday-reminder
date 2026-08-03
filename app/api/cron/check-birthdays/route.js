import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { sendTelegramReminder } from "@/lib/telegram";
import { generateRegardsSuggestion } from "@/lib/gemini";
import { timingSafeEqualStr } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Accepts the secret either as a Bearer header (what Vercel's own cron
// sends) or as a `?secret=` query param — the latter exists so free
// external cron-ping services whose UI doesn't expose custom headers can
// still authenticate, just by pasting the secret into the URL.
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: an unset secret must never mean "anyone may trigger this"

  const authHeader = request.headers.get("authorization") || "";
  if (timingSafeEqualStr(authHeader, `Bearer ${secret}`)) return true;

  const querySecret = request.nextUrl.searchParams.get("secret") || "";
  if (querySecret && timingSafeEqualStr(querySecret, secret)) return true;

  return false;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  // Each account stores its own reminder hour AND UTC offset (captured from
  // their browser when they saved it in Settings) — both are needed to
  // compute "what date and hour is it for this person right now" correctly.
  // Using only the server's own UTC calendar date here would be wrong for
  // anyone not in UTC: e.g. someone at UTC+3 already has a new local date
  // for the first ~3 hours of their day while UTC's date hasn't rolled over
  // yet, so birthday matching against UTC's date would silently miss.
  const { rows } = await sql`
    WITH targets AS (
      SELECT
        u.id AS user_id,
        u.telegram_chat_id,
        u.reminder_offset_days,
        u.suggest_message,
        (
          ((now() AT TIME ZONE 'UTC') - (u.reminder_utc_offset_minutes * interval '1 minute'))::date
          + u.reminder_offset_days
        ) AS target_date
      FROM users u
      WHERE u.telegram_chat_id IS NOT NULL
        AND u.reminder_local_hour = EXTRACT(
          HOUR FROM ((now() AT TIME ZONE 'UTC') - (u.reminder_utc_offset_minutes * interval '1 minute'))
        )::int
    )
    SELECT
      f.id, f.name, f.birthday, f.note,
      t.telegram_chat_id, t.reminder_offset_days, t.suggest_message,
      EXTRACT(YEAR FROM t.target_date)::int AS target_year,
      EXTRACT(MONTH FROM t.target_date)::int AS target_month,
      EXTRACT(DAY FROM t.target_date)::int AS target_day
    FROM friends f
    JOIN targets t ON t.user_id = f.user_id
    WHERE EXTRACT(MONTH FROM f.birthday) = EXTRACT(MONTH FROM t.target_date)
      AND EXTRACT(DAY FROM f.birthday) = EXTRACT(DAY FROM t.target_date)
      AND (
        f.last_reminded_year IS NULL
        OR f.last_reminded_year <> EXTRACT(YEAR FROM t.target_date)
      );
  `;

  const results = [];

  for (const friend of rows) {
    const when = friend.reminder_offset_days === 0 ? "today" : "tomorrow";
    const dateLabel = new Date(
      Date.UTC(friend.target_year, friend.target_month - 1, friend.target_day)
    ).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const noteSuffix = friend.note ? ` (${friend.note})` : "";
    let message =
      `🎂 Reminder: it's ${friend.name}'s${noteSuffix} birthday ${when}, ` +
      `${dateLabel}! Don't forget to send your regards.`;

    if (friend.suggest_message) {
      const suggestion = await generateRegardsSuggestion({ name: friend.name, note: friend.note });
      if (suggestion) {
        message += `\n\n💬 Suggested message: "${suggestion}"`;
      }
    }

    try {
      await sendTelegramReminder(friend.telegram_chat_id, message);
      await sql`
        UPDATE friends SET last_reminded_year = ${friend.target_year} WHERE id = ${friend.id};
      `;
      results.push({ friendId: friend.id, name: friend.name, status: "sent" });
    } catch (err) {
      console.error(`Reminder failed for friend ${friend.id}`, err);
      results.push({ friendId: friend.id, name: friend.name, status: "failed", error: err.message });
    }
  }

  return NextResponse.json({
    checked: rows.length,
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
