import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { GROUP_COLOR_NAMES } from "@/lib/colors";

export async function GET() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, name, color FROM groups ORDER BY created_at ASC;
  `;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await ensureSchema();
  const { name, color } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const safeColor = GROUP_COLOR_NAMES.includes(color) ? color : "pink";

  try {
    const { rows } = await sql`
      INSERT INTO groups (name, color)
      VALUES (${name.trim()}, ${safeColor})
      RETURNING id, name, color;
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    if (String(err.message).includes("duplicate key")) {
      return NextResponse.json(
        { error: "A group with that name already exists" },
        { status: 409 }
      );
    }
    throw err;
  }
}
