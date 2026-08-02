import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { normalizeColor } from "@/lib/colors";
import { validateGroupPayload, parsePositiveIntParam } from "@/lib/validate";
import { getUserId } from "@/lib/auth";

export async function PUT(request, { params }) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const id = parsePositiveIntParam(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const result = validateGroupPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const safeColor = normalizeColor(body?.color);

  const { rows } = await sql`
    UPDATE groups
    SET name = ${result.data.name}, color = ${safeColor}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, name, color;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(request, { params }) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const id = parsePositiveIntParam(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  // friends.group_id has ON DELETE SET NULL, so members just become ungrouped
  const { rows } = await sql`DELETE FROM groups WHERE id = ${id} AND user_id = ${userId} RETURNING id;`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
