import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="num text-5xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">That page doesn’t exist in your tracker.</p>
      <Button asChild variant="secondary">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </main>
  );
}
