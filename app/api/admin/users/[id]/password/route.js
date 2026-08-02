import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId, hashPassword } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { parsePositiveIntParam, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/validate";

export async function PUT(request, { params }) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const targetId = parsePositiveIntParam(params.id);
  if (targetId === null) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(newPassword);
  const { rows } = await sql`
    UPDATE users SET password_hash = ${newHash} WHERE id = ${targetId} RETURNING id;
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
