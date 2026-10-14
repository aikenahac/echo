import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

// Keep a single instance across dev hot reloads, which re-evaluate this module
// and would otherwise open a new connection pool each time
const globalForDb = globalThis as unknown as { __db?: DbType };

function getDb(): DbType {
  if (!globalForDb.__db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const client = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20, // seconds
      connect_timeout: 10, // seconds
    });
    globalForDb.__db = drizzle(client, { schema });
  }
  return globalForDb.__db;
}

export const db = new Proxy({} as DbType, {
  get: (_, prop) => {
    return getDb()[prop as keyof DbType];
  },
}) as DbType;
