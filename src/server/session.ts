/**
 * JWT session helpers that are safe to use from proxy.ts (no server-only / next/headers).
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "dsa_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(secret: string): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key(secret));
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!token || !secret || secret.length < 32) return false;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return payload.sub === "owner";
  } catch {
    return false;
  }
}
