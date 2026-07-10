import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from "pg";

let activePool: Pool | null = null;

const getPool = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  if (!activePool) {
    activePool = new Pool({
      connectionString,
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    });
  }

  return activePool;
};

export const pool = {
  query: <T extends QueryResultRow = any>(
    queryTextOrConfig: string | QueryConfig<any[]>,
    values?: any[]
  ): Promise<QueryResult<T>> => getPool().query<T>(queryTextOrConfig as any, values),
  connect: (): Promise<PoolClient> => getPool().connect(),
  end: () => (activePool ? activePool.end() : Promise.resolve()),
};

export const initPostgres = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      country_code TEXT DEFAULT '+20',
      job TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      avatar_public_id TEXT DEFAULT '',
      is_admin BOOLEAN DEFAULT FALSE,
      profile JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      data JSONB DEFAULT '{}'::jsonb,
      scan_count INTEGER DEFAULT 0,
      last_scanned_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scan_logs (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      qr_id TEXT REFERENCES qr_codes(id) ON DELETE SET NULL,
      scanned_at TIMESTAMPTZ DEFAULT NOW(),
      user_agent TEXT DEFAULT 'unknown',
      ip TEXT DEFAULT 'unknown',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_scan_logs_code_scanned_at ON scan_logs(code, scanned_at DESC);
  `);

  // Subscription plans are added independently so existing production data is preserved.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      features JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES plans(id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS purchased_products JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  // Marketing campaigns are isolated from existing user and QR data.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'queued',
      total_users INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at
      ON marketing_campaigns(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
      ON marketing_campaigns(status);
  `);

  await pool.query(
    `INSERT INTO plans (id, key, name, is_active, is_default, features, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     ON CONFLICT (key) DO NOTHING`,
    [
      "plan_basic",
      "basic",
      "Basic",
      true,
      true,
      JSON.stringify({
        canEditProfile: true,
        maxLinks: 3,
        allowDuplicateType: false,
        blockedSections: ["other"],
        showLolyLogo: true,
      }),
    ]
  );

  await pool.query(
    `INSERT INTO plans (id, key, name, is_active, is_default, features, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     ON CONFLICT (key) DO NOTHING`,
    [
      "plan_pro",
      "pro",
      "Pro",
      true,
      false,
      JSON.stringify({
        canEditProfile: true,
        maxLinks: null,
        allowDuplicateType: true,
        blockedSections: [],
        showLolyLogo: true,
      }),
    ]
  );

  // Backfill before the constraint so no existing account loses its current capabilities.
  await pool.query(`
    UPDATE users
    SET plan_id = (SELECT id FROM plans WHERE key = 'pro')
    WHERE plan_id IS NULL;

    ALTER TABLE users ALTER COLUMN plan_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_single_default ON plans ((is_default)) WHERE is_default = TRUE;
  `);
};
