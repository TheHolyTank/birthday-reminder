import { sql } from "@vercel/postgres";

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      telegram_chat_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // older deployments created this table with an "email" column — rename it
  // in place (same stored values, just no longer treated as an email address)
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users RENAME COLUMN email TO username;
      END IF;
    END $$;
  `;
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE users RENAME CONSTRAINT users_email_key TO users_username_key;
      END IF;
    END $$;
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

  // no display-name field — the username itself is what's shown
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS name;`;

  // profile photo, same base64-data-URL convention as friends.photo_url
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;`;

  // Telegram chat id verification (pending id/code are only promoted to the
  // real, cron-visible telegram_chat_id once confirmed)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_pending_chat_id TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_verify_code TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_verify_expires_at TIMESTAMPTZ;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;`;

  // per-account reminder timing: 1 = day before the birthday (default,
  // matches the original single global schedule), 0 = day of.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_offset_days SMALLINT NOT NULL DEFAULT 1;`;

  // reminder_local_hour (0-23) + reminder_utc_offset_minutes together let us
  // compute "what date is it for this user right now" correctly — storing
  // only a pre-converted UTC hour (an earlier version of this column) isn't
  // enough, because the calendar DATE can already have rolled over locally
  // while UTC's date hasn't yet (or vice versa), which silently broke
  // matching for part of the day for anyone not in UTC. Offset is captured
  // fresh from the browser each time reminder settings are saved, using the
  // same sign convention as JS's Date.getTimezoneOffset() (UTC = local +
  // offset); it goes stale across DST transitions until next saved.
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS reminder_hour_utc;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_local_hour SMALLINT NOT NULL DEFAULT 20;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_utc_offset_minutes SMALLINT NOT NULL DEFAULT 0;`;

  // opt-in only ("do it only if he asks") — when true, the cron job asks
  // Gemini to suggest a short regards message for that friend and includes
  // it in the Telegram reminder text.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS suggest_message BOOLEAN NOT NULL DEFAULT false;`;

  // one-time backfill for deployments from before is_admin existed: the
  // earliest-created account becomes admin. No-op once any admin exists
  // (new deployments instead mark the first-ever signup admin directly, see
  // lib/onboarding.js).
  await sql`
    UPDATE users SET is_admin = true
    WHERE id = (SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1)
      AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = true);
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_friends_group_id ON friends (group_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_reminder_local_hour ON users (reminder_local_hour);`;
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
