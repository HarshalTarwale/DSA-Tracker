import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDateString } from "@/lib/dates";
import { requireSession, UnauthorizedError } from "./auth";

/**
 * Wraps a Server Action body: checks the session, validates input with zod,
 * maps errors to { ok: false, error } and revalidates every app route on success.
 */
export async function runAction<S extends z.ZodType, R>(
  schema: S,
  input: unknown,
  fn: (data: z.infer<S>) => Promise<R>,
): Promise<{ ok: true; data: R } | { ok: false; error: string }> {
  try {
    await requireSession();
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid input" };
    }
    const data = await fn(parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: "Session expired. Please sign in again." };
    if (err instanceof ActionError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Expected, user-facing failures (not found, conflicts…). */
export class ActionError extends Error {}

export const zDate = z.string().refine(isDateString, "must be a YYYY-MM-DD date");
export const zOptText = (max = 5000) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null));
