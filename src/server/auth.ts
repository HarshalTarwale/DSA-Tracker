import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySessionToken } from "./session";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

/** Constant-time password check (hash both sides so lengths always match). */
export function passwordMatches(input: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(getEnv().APP_PASSWORD).digest();
  return timingSafeEqual(a, b);
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value, getEnv().AUTH_SECRET);
}

/** For Server Actions and route handlers: throws if not signed in. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) throw new UnauthorizedError();
}

/** For layouts/pages: redirects to /login if not signed in. */
export async function requirePageSession(next = "/"): Promise<void> {
  if (!(await hasValidSession())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function createSession(): Promise<void> {
  const token = await signSession(getEnv().AUTH_SECRET);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
