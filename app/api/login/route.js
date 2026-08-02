import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { createSessionToken, verifyPasswordHash, DUMMY_PASSWORD_HASH, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request) {
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  await ensureSchema();

  const body = await request.json().catch(() => ({}));
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const fail = () => NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
  if (!username || !password) return fail();

  const { rows } = await sql`SELECT id, password_hash FROM users WHERE username = ${username};`;

  if (rows.length === 0) {
    // Burn equivalent time to the real-user path so response latency can't
    // be used to enumerate which usernames have accounts.
    await verifyPasswordHash(password, DUMMY_PASSWORD_HASH);
    return fail();
  }

  const valid = await verifyPasswordHash(password, rows[0].password_hash);
  if (!valid) return fail();

  const token = await createSessionToken(rows[0].id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
