import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export async function GET() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT f.id, f.name, f.birthday, f.note, f.group_id,
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
  const { name, birthday, note, groupId } = await request.json();

  if (!name || !birthday) {
    return NextResponse.json(
      { error: "name and birthday are required" },
      { status: 400 }
    );
  }

  const { rows } = await sql`
    INSERT INTO friends (name, birthday, note, group_id)
    VALUES (${name}, ${birthday}, ${note || null}, ${groupId || null})
    RETURNING id, name, birthday, note, group_id;
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
