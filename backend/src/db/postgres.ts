import { Pool, QueryConfig, QueryResult, QueryResultRow } from "pg";

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
};
