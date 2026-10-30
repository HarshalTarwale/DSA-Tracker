"use client";

import { useActionState } from "react";
import { Loader2Icon, LockIcon } from "lucide-react";
import { loginAction, type LoginState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
        {state?.error && (
          <p id="login-error" role="alert" className="text-sm text-hard">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <LockIcon />}
        Sign in
      </Button>
    </form>
  );
}
