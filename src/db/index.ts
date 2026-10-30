import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

let instance: DB | null = null;

/** Lazily-created Drizzle client over Neon's HTTP driver (works on Vercel serverless). */
export function getDb(): DB {
  if (!instance) {
    instance = drizzle({ client: neon(getEnv().DATABASE_URL), schema });
  }
  return instance;
}

export { schema };
