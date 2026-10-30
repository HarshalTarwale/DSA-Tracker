import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/session";

/**
 * Optimistic auth gate: unauthenticated requests go to /login?next=…
 * Every Server Action, route handler and the (app) layout re-check the session.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const ok = await verifySessionToken(token, process.env.AUTH_SECRET);

  if (pathname === "/login") {
    if (ok) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    const next = `${pathname}${search}`;
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals, metadata/PWA files and static assets.
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|sw\\.js|robots\\.txt|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt|xml)$).*)",
  ],
};
