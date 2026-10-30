import { cn } from "@/lib/utils";

export function PatternTriggerList({
  triggers,
  className,
}: {
  triggers: { trigger: string; pattern: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col divide-y divide-border", className)}>
      {triggers.map((t) => (
        <div key={t.trigger} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-sm">“{t.trigger}”</dt>
          <dd className="text-xs font-medium text-accent">→ {t.pattern}</dd>
        </div>
      ))}
    </dl>
  );
}
