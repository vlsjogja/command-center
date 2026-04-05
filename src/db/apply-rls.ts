import postgres from "postgres";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function applyRLS() {
  const connectionString = process.env.COMMAND_CENTER_POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ COMMAND_CENTER_POSTGRES_URL belum diset.");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  const tables = [
    "users",
    "participants",
    "status_history",
    "class_packages",
    "participant_classes",
    "packages",
    "payments",
    "teachers",
    "attendance_records",
    "student_attendance",
    "message_templates"
  ];

  console.log("🔒 Securing database with Row Level Security (RLS)...\n");

  try {
    for (const table of tables) {
      console.log(`Applying RLS to [${table}]...`);
      // Enable RLS. If no policies are created, it results in a "default deny" 
      // preventing any access from the Supabase public anon key.
      await sql`ALTER TABLE ${sql(table)} ENABLE ROW LEVEL SECURITY`;
    }

    console.log("\n✅ RLS Successfully Enabled on all tables.");
    console.log("   Info: Your Server components utilizing Drizzle ORM will continue to work");
    console.log("         because Drizzle connects using the privileged Postgres role, which");
    console.log("         bypasses RLS. However, direct external API access is now blocked!");
  } catch (error) {
    console.error("❌ Failed to apply RLS:", error);
  } finally {
    await sql.end();
  }
}

applyRLS();
