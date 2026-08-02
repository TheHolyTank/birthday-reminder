import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function PUT(request, { params }) {
  await ensureSchema();
  const { name, birthday, note, groupId } = await request.json();

  if (!name || !birthday) {
    return NextResponse.json(
      { error: "name and birthday are required" },
      { status: 400 }
    );
  }

  const { rows } = await sql`
    UPDATE friends
    SET name = ${name}, birthday = ${birthday}, note = ${note || null}, group_id = ${groupId || null}
    WHERE id = ${params.id}
    RETURNING id, name, birthday, note, group_id;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(request, { params }) {
  await ensureSchema();
  await sql`DELETE FROM friends WHERE id = ${params.id};`;
  return NextResponse.json({ ok: true });
}
