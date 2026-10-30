import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_70%)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="num flex size-12 items-center justify-center rounded-xl border border-border bg-card text-lg font-semibold">
            {"{}"}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">DSA Tracker</h1>
            <p className="mt-1 text-sm text-muted-foreground">16 weeks · 252 problems · one plan</p>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
