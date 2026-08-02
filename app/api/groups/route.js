import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { normalizeColor } from "@/lib/colors";
import { validateGroupPayload } from "@/lib/validate";
import { getUserId } from "@/lib/auth";

export async function GET(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, name, color FROM groups WHERE user_id = ${userId} ORDER BY created_at ASC;
  `;
  return NextResponse.json(rows);
}

export async function POST(request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const body = await request.json().catch(() => null);
  const result = validateGroupPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const safeColor = normalizeColor(body?.color);

  try {
    const { rows } = await sql`
      INSERT INTO groups (user_id, name, color)
      VALUES (${userId}, ${result.data.name}, ${safeColor})
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
