// The bot's own @username never changes, so cache it for the life of this
// warm serverless instance instead of hitting Telegram's API every request.
let cachedBotUsername = null;

export async function getBotUsername() {
  if (cachedBotUsername) return cachedBotUsername;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok && body.result?.username) {
      cachedBotUsername = body.result.username;
    }
  } catch {
    // network error or Telegram unreachable — caller just gets null back
  }
  return cachedBotUsername;
}

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
