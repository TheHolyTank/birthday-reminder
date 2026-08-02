import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { parsePositiveIntParam } from "@/lib/validate";

export async function DELETE(request, { params }) {
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
  if (targetId === userId) {
    return NextResponse.json({ error: "You can't delete your own account here" }, { status: 400 });
  }

  // friends/groups have ON DELETE CASCADE on user_id, so this cleans up everything
  const { rows } = await sql`DELETE FROM users WHERE id = ${targetId} RETURNING id;`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
