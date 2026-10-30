"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { EnvError } from "@/lib/env";
import { createSession, destroySession, passwordMatches } from "@/server/auth";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  password: z.string().min(1, "Enter your password").max(512),
  next: z.string().optional(),
});

/** Only allow same-site relative paths as redirect targets. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/login")) return "/";
  return next;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    if (!passwordMatches(parsed.data.password)) {
      await new Promise((r) => setTimeout(r, 800));
      return { error: "Wrong password" };
    }
    await createSession();
  } catch (err) {
    if (err instanceof EnvError) {
      console.error(err.message);
      return { error: `Server setup problem: ${err.problems.join("; ")}. Fix it in the hosting env settings and redeploy.` };
    }
    throw err;
  }
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
