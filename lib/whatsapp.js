export async function sendWhatsAppReminder(message) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!phone || !apikey) {
    throw new Error(
      "CALLMEBOT_PHONE or CALLMEBOT_APIKEY is not set in the environment"
    );
  }

  const url =
    "https://api.callmebot.com/whatsapp.php?" +
    new URLSearchParams({ phone, text: message, apikey });

  const res = await fetch(url);
  const body = await res.text();

  if (!res.ok) {
    throw new Error(`CallMeBot request failed (${res.status}): ${body}`);
  }

  return body;
}
