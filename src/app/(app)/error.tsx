"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
      <AlertTriangleIcon className="size-6 text-medium" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page could not load. If this keeps happening, check that the database is reachable and seeded
        (<code className="num">npm run db:migrate && npm run db:seed</code>).
      </p>
      {error.digest && <p className="num text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <Button variant="secondary" onClick={reset}>
        <RotateCcwIcon /> Try again
      </Button>
    </div>
  );
}
