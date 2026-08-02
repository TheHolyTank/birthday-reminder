import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { isValidVerificationCode } from "@/lib/validate";

export async function POST(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!isValidVerificationCode(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }

  const { rows } = await sql`
    SELECT telegram_pending_chat_id, telegram_verify_code, telegram_verify_expires_at
    FROM users WHERE id = ${userId};
  `;
  const user = rows[0];

  if (!user || !user.telegram_pending_chat_id || !user.telegram_verify_code) {
    return NextResponse.json({ error: "No verification in progress — send a new code" }, { status: 400 });
  }
  if (new Date(user.telegram_verify_expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired — send a new one" }, { status: 400 });
  }
  if (code !== user.telegram_verify_code) {
    return NextResponse.json({ error: "Incorrect code" }, { status: 401 });
  }

  const { rows: updated } = await sql`
    UPDATE users
    SET telegram_chat_id = telegram_pending_chat_id,
        telegram_pending_chat_id = NULL,
        telegram_verify_code = NULL,
        telegram_verify_expires_at = NULL
    WHERE id = ${userId}
    RETURNING username, telegram_chat_id, is_admin;
  `;

  return NextResponse.json(updated[0]);
}
