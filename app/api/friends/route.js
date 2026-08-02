import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { validateFriendPayload } from "@/lib/validate";

export async function GET() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT f.id, f.name, f.birthday, f.note, f.photo_url, f.group_id, f.last_reminded_year,
           g.name AS group_name, g.color AS group_color
    FROM friends f
    LEFT JOIN groups g ON g.id = f.group_id
    ORDER BY
      EXTRACT(MONTH FROM f.birthday),
      EXTRACT(DAY FROM f.birthday);
  `;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();
  const body = await request.json().catch(() => null);
  const result = validateFriendPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { name, birthday, note, groupId, photoUrl } = result.data;

  const { rows } = await sql`
    INSERT INTO friends (name, birthday, note, group_id, photo_url)
    VALUES (${name}, ${birthday}, ${note}, ${groupId}, ${photoUrl})
    RETURNING id, name, birthday, note, group_id, photo_url;
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
