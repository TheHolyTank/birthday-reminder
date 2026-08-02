// Uses only the Web Crypto API (`crypto.subtle`), not Node's `crypto` module,
// so this file works unmodified in both the Edge runtime (middleware.js) and
// the Node.js runtime (API route handlers).

export const AUTH_COOKIE_NAME = "birthday_auth";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Signing key is derived from SITE_PASSWORD rather than a separate secret, so
// rotating the site password (which you'd do after any suspected leak anyway)
// also invalidates every existing session — a free "log out everywhere" lever.
async function getKey() {
  const digest = await crypto.subtle.digest("SHA-256", utf8Bytes(process.env.SITE_PASSWORD || ""));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken() {
  const expiry = Date.now() + SESSION_MS;
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, utf8Bytes(String(expiry)));
  return `${expiry}.${base64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token) {
  if (!token) return false;
  const [expiryStr, sigB64] = token.split(".");
  if (!expiryStr || !sigB64) return false;
  if (Date.now() > Number(expiryStr)) return false;
  try {
    const key = await getKey();
    return await crypto.subtle.verify("HMAC", key, base64urlDecode(sigB64), utf8Bytes(expiryStr));
  } catch {
    return false;
  }
}

export function timingSafeEqualStr(a, b) {
  const aBytes = utf8Bytes(a);
  const bBytes = utf8Bytes(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}
