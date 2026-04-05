import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string from Supabase project settings
// Dashboard → Settings → Database → Connection string (URI)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Database queries will fail.\n" +
    "   Set DATABASE_URL in your .env.local file or Vercel environment variables.\n" +
    "   Get it from: Supabase Dashboard → Settings → Database → Connection string"
  );
}

// Create postgres client
// `prepare: false` is required for Supabase in transaction pool mode
const client = postgres(connectionString ?? "", {
  prepare: false,
  // In serverless environments, limit connection pool
  max: 1,
});

// Export the drizzle database instance with schema
export const db = drizzle(client, { schema });
