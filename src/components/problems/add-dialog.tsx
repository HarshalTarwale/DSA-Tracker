"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty } from "@/db/schema";
import { createCustomProblem } from "@/server/actions/problems";
import { DIFFICULTIES, DIFFICULTY_LABEL } from "@/lib/constants";
import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const native =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function AddProblemDialog({ defaultTopicId }: { defaultTopicId?: string }) {
  const { topics } = useApp();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(form: FormData) {
    const lcRaw = String(form.get("lcNumber") ?? "").trim();
    const lcNumber = lcRaw ? Number(lcRaw) : null;
    if (lcNumber !== null && (!Number.isInteger(lcNumber) || lcNumber <= 0)) {
      setError("LC number must be a positive whole number");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCustomProblem({
        title: String(form.get("title") ?? ""),
        topicId: String(form.get("topicId") ?? ""),
        difficulty: String(form.get("difficulty") ?? "medium") as Difficulty,
        lcNumber,
        url: String(form.get("url") ?? "") || null,
        keyIdea: String(form.get("keyIdea") ?? "") || null,
      });
      if (res.ok) {
        toast.success("Custom problem added");
        setOpen(false);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <PlusIcon /> Add problem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a custom problem</DialogTitle>
          <DialogDescription>
            Counts toward its topic’s target and solved totals, but not the plan curve or ahead/behind.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-title">Title</Label>
            <Input id="add-title" name="title" required maxLength={200} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-lc">LC # (optional)</Label>
              <Input id="add-lc" name="lcNumber" inputMode="numeric" className="num" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-diff">Difficulty</Label>
              <select id="add-diff" name="difficulty" defaultValue="medium" className={native}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-topic">Topic</Label>
            <select id="add-topic" name="topicId" defaultValue={defaultTopicId ?? topics[0]?.id} className={native}>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.order}. {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-url">URL (optional)</Label>
            <Input id="add-url" name="url" type="url" placeholder="https://leetcode.com/problems/…" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="add-idea">Key idea (optional)</Label>
            <Input id="add-idea" name="keyIdea" maxLength={1000} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-hard">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Add problem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
