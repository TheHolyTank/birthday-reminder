import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { sendTelegramReminder } from "@/lib/telegram";
import { toISODate } from "@/lib/date";

export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: an unset secret must never mean "anyone may trigger this"
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const now = new Date();
  const todayUtc = toISODate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  const currentHourUtc = now.getUTCHours();

  // Each account picks its own delivery hour (UTC) and whether to be
  // reminded the day before or the day of the birthday, so "today's target
  // date" is computed per-user (todayUtc + their offset), not once globally.
  // Vercel's free plan can only trigger this once a day, so an external
  // hourly pinger (see README) is what actually makes reminder_hour_utc
  // precise — this route just answers "who's due right now" whenever it runs.
  const { rows } = await sql`
    SELECT
      f.id, f.name, f.birthday, f.note,
      u.telegram_chat_id, u.reminder_offset_days,
      EXTRACT(YEAR FROM (${todayUtc}::date + u.reminder_offset_days))::int AS target_year,
      EXTRACT(MONTH FROM (${todayUtc}::date + u.reminder_offset_days))::int AS target_month,
      EXTRACT(DAY FROM (${todayUtc}::date + u.reminder_offset_days))::int AS target_day
    FROM friends f
    JOIN users u ON u.id = f.user_id
    WHERE u.telegram_chat_id IS NOT NULL
      AND u.reminder_hour_utc = ${currentHourUtc}
      AND EXTRACT(MONTH FROM f.birthday) = EXTRACT(MONTH FROM (${todayUtc}::date + u.reminder_offset_days))
      AND EXTRACT(DAY FROM f.birthday) = EXTRACT(DAY FROM (${todayUtc}::date + u.reminder_offset_days))
      AND (
        f.last_reminded_year IS NULL
        OR f.last_reminded_year <> EXTRACT(YEAR FROM (${todayUtc}::date + u.reminder_offset_days))
      );
  `;

  const results = [];

  for (const friend of rows) {
    const when = friend.reminder_offset_days === 0 ? "today" : "tomorrow";
    const dateLabel = new Date(
      Date.UTC(friend.target_year, friend.target_month - 1, friend.target_day)
    ).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const noteSuffix = friend.note ? ` (${friend.note})` : "";
    const message =
      `🎂 Reminder: it's ${friend.name}'s${noteSuffix} birthday ${when}, ` +
      `${dateLabel}! Don't forget to send your regards.`;

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
