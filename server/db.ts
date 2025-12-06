import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Prefer Supabase database if available, fallback to local
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const localUrl = process.env.DATABASE_URL;

let pool: pg.Pool;

if (supabaseUrl) {
  // Parse Supabase URL and use separate parameters to avoid SCRAM auth issues
  try {
    const url = new URL(supabaseUrl);
    pool = new Pool({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    console.log('Database: Supabase (pooler mode with separate params)');
  } catch (e) {
    console.error('Failed to parse SUPABASE_DATABASE_URL:', e);
    throw e;
  }
} else if (localUrl) {
  pool = new Pool({ 
    connectionString: localUrl
  });
  console.log('Database: Local PostgreSQL');
} else {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Prevent unhandled pool errors from crashing the process; log and let pg handle reconnection
pool.on("error", (err) => {
  console.error("Unexpected database error (pool)", err);
});

export { pool };
export const db = drizzle(pool, { schema });
