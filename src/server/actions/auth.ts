"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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

  if (!passwordMatches(parsed.data.password)) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Wrong password" };
  }

  await createSession();
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
