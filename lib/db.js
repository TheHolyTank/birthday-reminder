import { sql } from "@vercel/postgres";

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT 'pink',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      birthday DATE NOT NULL,
      note TEXT,
      photo_url TEXT,
      group_id INT REFERENCES groups(id) ON DELETE SET NULL,
      last_reminded_year INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // older deployments may already have a friends table missing newer columns
  await sql`ALTER TABLE friends ADD COLUMN IF NOT EXISTS group_id INT REFERENCES groups(id) ON DELETE SET NULL;`;
  await sql`ALTER TABLE friends ADD COLUMN IF NOT EXISTS photo_url TEXT;`;

  await sql`
    INSERT INTO groups (name, color)
    SELECT * FROM (VALUES ('Friends', 'pink'), ('Family', 'indigo'), ('Work', 'teal')) AS defaults(name, color)
    WHERE NOT EXISTS (SELECT 1 FROM groups);
  `;

  initialized = true;
}

export { sql };
