import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a Postgres connection URL"),
  APP_PASSWORD: z.string().min(1, "APP_PASSWORD is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validated server env. Validation runs on first use (not at import) so that
 * `next build` can compile without secrets present; any request that touches
 * the DB or auth fails loudly with a clear message if a variable is missing.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment variables:\n${issues.join("\n")}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
