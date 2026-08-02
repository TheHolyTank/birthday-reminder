import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { validateFriendPayload, parsePositiveIntParam } from "@/lib/validate";

export async function PUT(request, { params }) {
  await ensureSchema();
  const id = parsePositiveIntParam(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid friend id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const result = validateFriendPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { name, birthday, note, groupId, photoUrl } = result.data;

  const { rows } = await sql`
    UPDATE friends
    SET name = ${name}, birthday = ${birthday}, note = ${note},
        group_id = ${groupId}, photo_url = ${photoUrl}
    WHERE id = ${id}
    RETURNING id, name, birthday, note, group_id, photo_url;
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function DELETE(request, { params }) {
  await ensureSchema();
  const id = parsePositiveIntParam(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid friend id" }, { status: 400 });
  }

  const { rows } = await sql`DELETE FROM friends WHERE id = ${id} RETURNING id;`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
