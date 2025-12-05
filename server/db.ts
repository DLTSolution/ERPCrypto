import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Prefer Supabase database if available, fallback to local
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const localUrl = process.env.DATABASE_URL;

const databaseUrl = supabaseUrl || localUrl;

if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure SSL for Supabase pooler connection
const isSupabase = !!supabaseUrl;

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isSupabase ? {
    rejectUnauthorized: false
  } : undefined,
  // For Supabase pooler (PgBouncer), disable prepared statements
  ...(isSupabase && {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  })
});

console.log(`Database: ${isSupabase ? 'Supabase (pooler)' : 'Local PostgreSQL'}`);

export const db = drizzle(pool, { schema });
