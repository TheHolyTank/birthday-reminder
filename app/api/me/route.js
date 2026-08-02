import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { validateNamePayload } from "@/lib/validate";

export async function GET(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const { rows } = await sql`SELECT username, name, telegram_chat_id, is_admin FROM users WHERE id = ${userId};`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PUT(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const check = validateNamePayload(body);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const { rows } = await sql`
    UPDATE users SET name = ${check.value}
    WHERE id = ${userId}
    RETURNING username, name, telegram_chat_id, is_admin;
  `;
  return NextResponse.json(rows[0]);
}
