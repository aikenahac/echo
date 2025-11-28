import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Running database migrations...");

  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  await migrate(db, { migrationsFolder: "./drizzle" });

  await migrationClient.end();

  console.log("Migrations completed successfully");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
