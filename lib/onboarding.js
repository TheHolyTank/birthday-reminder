import { sql } from "@/lib/db";

const DEFAULT_GROUPS = [
  ["Friends", "#ec4899"],
  ["Family", "#6366f1"],
  ["Work", "#14b8a6"],
];

// Called right after a new user row is inserted. The very first account ever
// created inherits any pre-existing (single-user-era) data instead of
// starting empty; every account after that gets fresh default groups.
export async function onboardNewUser(userId) {
  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM users;`;
  const isOnlyUser = rows[0].count === 1;

  if (isOnlyUser) {
    await sql`UPDATE friends SET user_id = ${userId} WHERE user_id IS NULL;`;
    await sql`UPDATE groups SET user_id = ${userId} WHERE user_id IS NULL;`;
    await sql`UPDATE users SET is_admin = true WHERE id = ${userId};`;
  } else {
    for (const [name, color] of DEFAULT_GROUPS) {
      await sql`INSERT INTO groups (user_id, name, color) VALUES (${userId}, ${name}, ${color});`;
    }
  }
}
