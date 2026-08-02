import { sql } from "@/lib/db";

export async function isAdmin(userId) {
  if (!userId) return false;
  const { rows } = await sql`SELECT is_admin FROM users WHERE id = ${userId};`;
  return rows.length > 0 && rows[0].is_admin === true;
}
