import { z } from "zod";

/**
 * Hosting dashboards store values literally, so a value pasted as `"abc"` arrives
 * with the quotes. Trim whitespace and strip one pair of matching outer quotes.
 */
function clean(value: unknown): unknown {
  if (typeof value !== "string") return value;
  let v = value.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const envSchema = z.object({
  DATABASE_URL: z.preprocess(
    clean,
    z
      .string({ error: "DATABASE_URL is missing" })
      .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must start with postgresql://"),
  ),
  APP_PASSWORD: z.preprocess(clean, z.string({ error: "APP_PASSWORD is missing" }).min(1, "APP_PASSWORD is empty")),
  AUTH_SECRET: z.preprocess(
    clean,
    z.string({ error: "AUTH_SECRET is missing" }).min(32, "AUTH_SECRET must be at least 32 characters"),
  ),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid environment variables:\n${problems.map((p) => `  - ${p}`).join("\n")}\nSee .env.example.`);
    this.name = "EnvError";
  }
}

let cached: Env | null = null;

/**
 * Validated server env. Validation runs on first use (not at import) so that
 * `next build` can compile without secrets present. The error names the bad
 * variables but never includes their values.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new EnvError(parsed.error.issues.map((i) => i.message));
  }
  cached = parsed.data;
  return cached;
}

/** AUTH_SECRET for the proxy (Edge), with the same quote/space cleanup; never throws. */
export function readAuthSecret(): string | undefined {
  const v = clean(process.env.AUTH_SECRET);
  return typeof v === "string" ? v : undefined;
}
