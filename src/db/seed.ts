/**
 * Database Seed Script
 * ====================
 * Inisialisasi database dengan data awal.
 * Hanya membuat akun Super Admin — tabel lain dikosongkan.
 *
 * Jalankan:
 *   npm run db:seed
 *
 * Pastikan DATABASE_URL sudah diset di .env.local
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as schema from "./schema";

// ─── Configuration ────────────────────────────────────
const SUPER_ADMIN = {
  name: "Super Admin",
  email: "superadmin@vlsjogja.com",
  password: "VLS@dmin2026!",
  role: "super_admin" as const,
};

// ─── Simple password hash (SHA-256) ───────────────────
// Untuk production, ganti dengan bcrypt/argon2
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Main Seed Function ──────────────────────────────
async function seed() {
  const connectionString = process.env.COMMAND_CENTER_POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL belum diset.");
    console.error("   Set di .env.local atau environment variable.");
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  console.log("🌱 Memulai seed database...\n");

  try {
    // ── 1. Hapus data lama (urutan: child → parent) ──
    console.log("🗑  Membersihkan data lama...");
    await db.delete(schema.studentAttendance);
    await db.delete(schema.attendanceRecords);
    await db.delete(schema.payments);
    await db.delete(schema.participantClasses);
    await db.delete(schema.packages);
    await db.delete(schema.classPackages);
    await db.delete(schema.statusHistory);
    await db.delete(schema.participants);
    await db.delete(schema.users);
    await db.delete(schema.teachers);
    await db.delete(schema.messageTemplates);
    console.log("   ✅ Semua tabel sudah kosong.\n");

    // ── 2. Buat akun Super Admin ─────────────────────
    console.log("👤 Membuat akun Super Admin...");
    const passwordHash = await hashPassword(SUPER_ADMIN.password);

    const [adminUser] = await db
      .insert(schema.users)
      .values({
        name: SUPER_ADMIN.name,
        email: SUPER_ADMIN.email,
        passwordHash: passwordHash,
        role: SUPER_ADMIN.role,
      })
      .returning();

    console.log("   ✅ Super Admin berhasil dibuat:");
    console.log(`      ID    : ${adminUser.id}`);
    console.log(`      Nama  : ${adminUser.name}`);
    console.log(`      Email : ${adminUser.email}`);
    console.log(`      Role  : ${adminUser.role}\n`);

    // ── Ringkasan ────────────────────────────────────
    console.log("═══════════════════════════════════════");
    console.log("✅ Seed selesai!");
    console.log("");
    console.log("📝 Informasi login:");
    console.log(`   Email    : ${SUPER_ADMIN.email}`);
    console.log(`   Password : ${SUPER_ADMIN.password}`);
    console.log("");
    console.log("⚠️  Segera ganti password setelah login pertama!");
    console.log("═══════════════════════════════════════");
  } catch (error) {
    console.error("❌ Seed gagal:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
