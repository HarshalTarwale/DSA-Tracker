import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  className,
  label,
  colorClass = "text-accent",
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: React.ReactNode;
  colorClass?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(v * 100)}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn("transition-[stroke-dashoffset] duration-200", colorClass)}
        />
      </svg>
      <span className="num absolute text-xs font-medium">{label ?? `${Math.round(v * 100)}%`}</span>
    </div>
  );
}

export function Bar({
  value,
  className,
  fillClass = "bg-accent",
  label,
}: {
  /** 0..1 */
  value: number;
  className?: string;
  fillClass?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-border", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-200", fillClass)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** "12 / 30" with an E/M/H coloured bar. */
export function DiffBar({
  label,
  solved,
  target,
  fillClass,
}: {
  label: string;
  solved: number;
  target: number;
  fillClass: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="num">
          {solved}
          <span className="text-muted-foreground">/{target}</span>
        </span>
      </div>
      <Bar value={target ? solved / target : 0} fillClass={fillClass} label={`${label} ${solved} of ${target}`} />
    </div>
  );
}
