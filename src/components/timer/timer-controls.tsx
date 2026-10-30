"use client";

import { PauseIcon, PlayIcon, SquareIcon, TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { elapsedMs, formatElapsed, useNow, useTimer } from "./timer-provider";

/** Floating pill shown on every page while a timer exists. */
export function TimerPill({ className }: { className?: string }) {
  const { timer, pause, resume, stop } = useTimer();
  const now = useNow(!!timer?.runningSince);
  if (!timer) return null;
  const running = !!timer.runningSince;
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border bg-card py-1 pr-1 pl-3 text-sm",
        className,
      )}
      role="timer"
      aria-label={`Timer for ${timer.title}`}
    >
      <TimerIcon className={cn("size-3.5", running ? "text-accent" : "text-muted-foreground")} />
      <span className="max-w-28 truncate text-xs text-muted-foreground sm:max-w-40" title={timer.title}>
        {timer.title}
      </span>
      <span className="num ml-1 font-medium">{formatElapsed(elapsedMs(timer, now))}</span>
      <Button
        size="icon-sm"
        variant="ghost"
        className="size-7 rounded-full"
        onClick={running ? pause : resume}
        aria-label={running ? "Pause timer" : "Resume timer"}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button size="icon-sm" variant="ghost" className="size-7 rounded-full" onClick={stop} aria-label="Stop timer">
        <SquareIcon className="size-3.5" />
      </Button>
    </div>
  );
}

/** Start / pause / stop for one problem row. */
export function TimerButton({ problemId, title }: { problemId: number; title: string }) {
  const { timer, start, pause, resume, stop } = useTimer();
  const mine = timer?.problemId === problemId;
  const running = mine && !!timer?.runningSince;
  const now = useNow(running);

  if (!mine) {
    return (
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => start(problemId, title)}
        aria-label={`Start timer for ${title}`}
        title="Start timer"
      >
        <TimerIcon className="text-muted-foreground" />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      <span className="num px-1 text-xs text-accent">{formatElapsed(elapsedMs(timer, now))}</span>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={running ? pause : resume}
        aria-label={running ? "Pause timer" : "Resume timer"}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={stop} aria-label="Stop timer">
        <SquareIcon className="size-3.5" />
      </Button>
    </div>
  );
}
