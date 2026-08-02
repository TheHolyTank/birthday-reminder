import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function GET(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { rows } = await sql`
    SELECT id, username, name, telegram_chat_id, is_admin, created_at
    FROM users
    ORDER BY created_at ASC;
  `;
  return NextResponse.json(rows);
}
