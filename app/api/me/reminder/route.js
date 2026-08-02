import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { validateReminderSettingsPayload } from "@/lib/validate";

export async function PUT(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const result = validateReminderSettingsPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { offsetDays, localHour, utcOffsetMinutes } = result.data;

  const { rows } = await sql`
    UPDATE users
    SET reminder_offset_days = ${offsetDays},
        reminder_local_hour = ${localHour},
        reminder_utc_offset_minutes = ${utcOffsetMinutes}
    WHERE id = ${userId}
    RETURNING username, photo_url, telegram_chat_id, is_admin,
              reminder_offset_days, reminder_local_hour, reminder_utc_offset_minutes;
  `;
  return NextResponse.json(rows[0]);
}
