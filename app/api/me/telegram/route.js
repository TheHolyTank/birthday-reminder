import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId, generateVerificationCode } from "@/lib/auth";
import { validateTelegramChatId } from "@/lib/validate";
import { sendTelegramReminder } from "@/lib/telegram";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Starts (or restarts) verification for a candidate chat id: generates a
// fresh 6-digit code, sends it to that chat, and stores it as "pending" —
// it only becomes the real, cron-visible telegram_chat_id once confirmed.
export async function POST(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const check = validateTelegramChatId(body?.telegramChatId);
  if (!check.ok || !check.value) {
    return NextResponse.json({ error: check.error || "Enter a chat id first" }, { status: 400 });
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  try {
    await sendTelegramReminder(
      check.value,
      `🔐 Your Birthday Reminder verification code is: ${code}\n\nEnter it in the app to confirm this chat. It expires in 10 minutes.`
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  await sql`
    UPDATE users
    SET telegram_pending_chat_id = ${check.value},
        telegram_verify_code = ${code},
        telegram_verify_expires_at = ${expiresAt}
    WHERE id = ${userId};
  `;

  return NextResponse.json({ ok: true });
}
