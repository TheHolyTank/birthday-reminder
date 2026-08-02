import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function PUT(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = await request.json().catch(() => null);
  const photoUrl = typeof body?.photoUrl === "string" && body.photoUrl ? body.photoUrl : null;

  const { rows } = await sql`
    UPDATE users SET photo_url = ${photoUrl}
    WHERE id = ${userId}
    RETURNING username, photo_url, telegram_chat_id, is_admin;
  `;
  return NextResponse.json(rows[0]);
}
