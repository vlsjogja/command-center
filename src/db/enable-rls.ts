/**
 * Database RLS Enabler Script
 * ===========================
 * Script ini mengaktifkan Row Level Security (RLS) pada semua tabel di skema "public".
 * Berguna untuk memperbaiki RLS yang ter-reset setelah menjalankan drizzle-kit push.
 *
 * Jalankan:
 *   npm run db:enable-rls
 */

import postgres from "postgres";
import * as dotenv from 'dotenv';
import path from 'path';

// Memastikan .env.local terbaca (seperti di seed.ts)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function enableRLS() {
  const connectionString = process.env.COMMAND_CENTER_POSTGRES_URL_NON_POOLING || process.env.COMMAND_CENTER_POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ ERROR: DATABASE_URL tidak ditemukan di .env.local");
    process.exit(1);
  }

  // Gunakan postgres client langsung untuk mengeksekusi DDL (ALTER TABLE)
  const sql = postgres(connectionString, { ssl: 'require' });

  console.log("🔍 Mencari tabel di skema 'public'...");

  try {
    // Ambil semua nama tabel di skema public
    const tables = await sql`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `;

    if (tables.length === 0) {
      console.log("ℹ️  Tidak ada tabel ditemukan di skema public.");
      return;
    }

    console.log(`🚀 Mengaktifkan RLS pada ${tables.length} tabel...\n`);

    for (const table of tables) {
      const tableName = table.tablename;
      
      try {
        // Eksekusi ALTER TABLE untuk mengaktifkan RLS
        // SQL Injection protection: tablename di-escape menggunakan identifier helper dari postgres.js
        await sql.unsafe(`ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;`);
        console.log(`   ✅ RLS diaktifkan untuk tabel: "${tableName}"`);
      } catch (err: any) {
        console.error(`   ❌ GAGAL mengaktifkan RLS untuk "${tableName}": ${err.message}`);
      }
    }

    console.log("\n✨ Selesai! Semua tabel di public schema sekarang memiliki RLS aktif.");
    console.log("💡 INFO: Pastikan Anda juga sudah mengatur 'Policies' di Supabase Dashboard agar data bisa diakses.");

  } catch (error: any) {
    console.error("❌ ERROR Utama:", error.message);
  } finally {
    await sql.end();
  }
}

enableRLS();
