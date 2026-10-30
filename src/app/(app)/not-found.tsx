import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <p className="num text-4xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">That page or topic doesn’t exist in your tracker.</p>
      <Button asChild variant="secondary">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
