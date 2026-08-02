import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId, hashPassword, verifyPasswordHash } from "@/lib/auth";
import { validatePasswordChangePayload } from "@/lib/validate";

export async function PUT(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const result = validatePasswordChangePayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { currentPassword, newPassword } = result.data;

  const { rows } = await sql`SELECT password_hash FROM users WHERE id = ${userId};`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const valid = await verifyPasswordHash(currentPassword, rows[0].password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${userId};`;

  return NextResponse.json({ ok: true });
}
