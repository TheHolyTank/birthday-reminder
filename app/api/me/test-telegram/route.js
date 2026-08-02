import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { validateTelegramChatId } from "@/lib/validate";
import { sendTelegramReminder } from "@/lib/telegram";

export async function POST(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const check = validateTelegramChatId(body?.telegramChatId);
  if (!check.ok || !check.value) {
    return NextResponse.json({ error: check.error || "Enter a chat id first" }, { status: 400 });
  }

  try {
    await sendTelegramReminder(
      check.value,
      "🎉 Test message from Birthday Reminder — your Telegram settings are working!"
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
