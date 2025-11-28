import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  console.log("Starting migration process...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("DATABASE_URL is set");
  console.log("Creating database connection...");

  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations from ./drizzle folder...");

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Closing database connection...");
  await migrationClient.end();

  console.log("✅ Migrations completed successfully");
}

runMigrations().catch((err) => {
  console.error("❌ Migration failed:");
  console.error(err);
  process.exit(1);
});
