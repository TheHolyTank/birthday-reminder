import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { sendTelegramReminder } from "@/lib/telegram";

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
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const month = tomorrow.getUTCMonth() + 1;
  const day = tomorrow.getUTCDate();
  const year = tomorrow.getUTCFullYear();

  const { rows } = await sql`
    SELECT id, name, birthday, note
    FROM friends
    WHERE EXTRACT(MONTH FROM birthday) = ${month}
      AND EXTRACT(DAY FROM birthday) = ${day}
      AND (last_reminded_year IS NULL OR last_reminded_year <> ${year});
  `;

  const results = [];

  for (const friend of rows) {
    const dateLabel = tomorrow.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
    const noteSuffix = friend.note ? ` (${friend.note})` : "";
    const message =
      `🎂 Reminder: it's ${friend.name}'s${noteSuffix} birthday tomorrow, ` +
      `${dateLabel}! Don't forget to send your regards.`;

    try {
      await sendTelegramReminder(message);
      await sql`
        UPDATE friends SET last_reminded_year = ${year} WHERE id = ${friend.id};
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
