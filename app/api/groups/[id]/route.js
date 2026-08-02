import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { GROUP_COLOR_NAMES } from "@/lib/colors";

export async function PUT(request, { params }) {
  await ensureSchema();
  const { name, color } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const safeColor = GROUP_COLOR_NAMES.includes(color) ? color : "pink";

  const { rows } = await sql`
    UPDATE groups
    SET name = ${name.trim()}, color = ${safeColor}
    WHERE id = ${params.id}
    RETURNING id, name, color;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(request, { params }) {
  await ensureSchema();
  // friends.group_id has ON DELETE SET NULL, so members just become ungrouped
  await sql`DELETE FROM groups WHERE id = ${params.id};`;
  return NextResponse.json({ ok: true });
}
