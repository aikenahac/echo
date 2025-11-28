import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: DbType | null = null;

function getDb(): DbType {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const client = postgres(process.env.DATABASE_URL);
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as DbType, {
  get: (_, prop) => {
    return getDb()[prop as keyof DbType];
  },
}) as DbType;
