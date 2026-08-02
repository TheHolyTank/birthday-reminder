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

// --- Session cookie signing (HMAC-SHA256, key derived from AUTH_SECRET) ---

async function getSigningKey() {
  const digest = await crypto.subtle.digest("SHA-256", utf8Bytes(process.env.AUTH_SECRET || ""));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken(userId) {
  const expiry = Date.now() + SESSION_MS;
  const payload = `${userId}.${expiry}`;
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign("HMAC", key, utf8Bytes(payload));
  return `${payload}.${base64url(new Uint8Array(sig))}`;
}

// Returns the authenticated user's id, or null if the token is missing,
// malformed, expired, or fails signature verification.
export async function verifySessionToken(token) {
  if (!token) return null;
  const [userIdStr, expiryStr, sigB64] = token.split(".");
  if (!/^\d+$/.test(userIdStr || "") || !expiryStr || !sigB64) return null;
  if (Date.now() > Number(expiryStr)) return null;
  try {
    const key = await getSigningKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(sigB64),
      utf8Bytes(`${userIdStr}.${expiryStr}`)
    );
    return ok ? Number(userIdStr) : null;
  } catch {
    return null;
  }
}

// Reads the trusted user id header set by middleware.js. Route handlers use
// this as a defense-in-depth check even though middleware already gates access.
export function getUserId(request) {
  const raw = request.headers.get("x-user-id");
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Six-digit code used to verify a Telegram chat id actually belongs to the
// account holder before it's trusted for real reminders.
export function generateVerificationCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

export function timingSafeEqualStr(a, b) {
  const aBytes = utf8Bytes(a);
  const bBytes = utf8Bytes(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

// --- Password hashing (PBKDF2-HMAC-SHA256 via Web Crypto, no dependency) ---

const PBKDF2_ITERATIONS = 210_000; // OWASP 2023 baseline for PBKDF2-SHA256
const PBKDF2_KEYLEN_BITS = 256;

async function pbkdf2(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey("raw", utf8Bytes(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMaterial,
    PBKDF2_KEYLEN_BITS
  );
  return new Uint8Array(bits);
}

// Self-describing format (algorithm$iterations$salt$hash) so the iteration
// count can change later without breaking previously-stored hashes.
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64url(salt)}$${base64url(hash)}`;
}

// A fixed, valid-format hash that never matches any real password — used to
// burn equivalent CPU time on "no such user" so login can't be used as a
// timing oracle to enumerate registered emails.
export const DUMMY_PASSWORD_HASH =
  "pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function verifyPasswordHash(password, stored) {
  const parts = typeof stored === "string" ? stored.split("$") : [];
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  try {
    const salt = base64urlDecode(parts[2]);
    const expected = base64urlDecode(parts[3]);
    const actual = await pbkdf2(password, salt, iterations);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}
