import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { isValidUsername, USERNAME_MAX_LENGTH } from "@/lib/validate";

export async function GET(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const { rows } = await sql`
    SELECT username, photo_url, telegram_chat_id, is_admin,
           reminder_offset_days, reminder_local_hour, reminder_utc_offset_minutes
    FROM users WHERE id = ${userId};
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PUT(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: `Username is required (max ${USERNAME_MAX_LENGTH} characters; letters, numbers, "_", "-", "." only)` },
      { status: 400 }
    );
  }

  try {
    const { rows } = await sql`
      UPDATE users SET username = ${username}
      WHERE id = ${userId}
      RETURNING username, photo_url, telegram_chat_id, is_admin,
                reminder_offset_days, reminder_local_hour, reminder_utc_offset_minutes;
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    if (String(err.message).includes("duplicate key")) {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    throw err;
  }
}
