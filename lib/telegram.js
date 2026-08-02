export async function sendTelegramReminder(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set, or no chatId was provided");
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.ok) {
    throw new Error(
      `Telegram request failed (${res.status}): ${body.description || "unknown error"}`
    );
  }

  return body;
}
