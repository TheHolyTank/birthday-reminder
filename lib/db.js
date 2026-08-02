import { sql } from "@vercel/postgres";

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      telegram_chat_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#ec4899',
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
  await sql`ALTER TABLE friends ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;`;
  await sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;`;

  // profile display name + Telegram chat id verification (pending id/code are
  // only promoted to the real, cron-visible telegram_chat_id once confirmed)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_pending_chat_id TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_verify_code TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_verify_expires_at TIMESTAMPTZ;`;

  await sql`CREATE INDEX IF NOT EXISTS idx_friends_group_id ON friends (group_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups (user_id);`;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_friends_birthday_month_day
      ON friends ((EXTRACT(MONTH FROM birthday)), (EXTRACT(DAY FROM birthday)));
  `;

  // groups.name used to be globally unique; it's now unique per owner instead,
  // since two different accounts should each be able to have e.g. a "Family" group
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_name_key') THEN
        ALTER TABLE groups DROP CONSTRAINT groups_name_key;
      END IF;
    END $$;
  `;
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_user_id_name_key') THEN
        ALTER TABLE groups ADD CONSTRAINT groups_user_id_name_key UNIQUE (user_id, name);
      END IF;
    END $$;
  `;

  initialized = true;
}

export { sql };
