const DEFAULT_MODEL = "gemini-2.0-flash";

// Best-effort only: this is a "nice to have" line added to a reminder, never
// something the reminder itself should fail over. Any problem (no key, rate
// limit, network error, unexpected response shape) just returns null and the
// caller sends the plain reminder instead.
export async function generateRegardsSuggestion({ name, note }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !name) return null;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const context = note ? ` (context: they are described as "${note}")` : "";
  const prompt =
    `Write one short birthday message someone could send to a person named "${name}"${context}. ` +
    `1-2 sentences, warm and genuine, casual tone. Reply with only the message itself — no quotation ` +
    `marks, no emoji, no preamble. If the name suggests a language other than English, write the ` +
    `message in that language instead.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.9 },
        }),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Gemini request failed", res.status, body?.error?.message);
      return null;
    }
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (err) {
    console.error("Gemini request errored", err);
    return null;
  }
}
