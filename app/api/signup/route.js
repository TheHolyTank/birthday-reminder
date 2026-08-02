import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { validateSignupPayload } from "@/lib/validate";
import { hashPassword, createSessionToken, timingSafeEqualStr, AUTH_COOKIE_NAME } from "@/lib/auth";
import { onboardNewUser } from "@/lib/onboarding";

export async function POST(request) {
  if (!process.env.AUTH_SECRET || !process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  await ensureSchema();

  const body = await request.json().catch(() => null);
  const result = validateSignupPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { username, password, inviteCode } = result.data;

  if (!timingSafeEqualStr(inviteCode, process.env.SITE_PASSWORD)) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 401 });
  }

  const passwordHash = await hashPassword(password);

  let userId;
  try {
    const { rows } = await sql`
      INSERT INTO users (username, password_hash) VALUES (${username}, ${passwordHash}) RETURNING id;
    `;
    userId = rows[0].id;
  } catch (err) {
    if (String(err.message).includes("duplicate key")) {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    throw err;
  }

  await onboardNewUser(userId);

  const token = await createSessionToken(userId);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
