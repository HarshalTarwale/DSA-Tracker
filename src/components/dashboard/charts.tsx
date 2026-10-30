"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLOR } from "@/lib/constants";
import { formatDate } from "@/lib/dates";

const axis = { stroke: CHART_COLOR.grid, tick: { fill: CHART_COLOR.muted, fontSize: 11 }, tickLine: false };

interface TipEntry {
  dataKey?: unknown;
  name?: unknown;
  value?: unknown;
  color?: string;
}

function Tip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: readonly TipEntry[];
  label?: unknown;
  fmt?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card-hover px-3 py-2 text-xs">
      {label !== undefined && label !== null && (
        <p className="mb-1 text-muted-foreground">{fmt ? fmt(String(label)) : String(label)}</p>
      )}
      {payload.map((p, i) => (
        <p key={String(p.dataKey ?? i)} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{String(p.name ?? "")}</span>
          <span className="num ml-auto font-medium">{p.value == null ? "–" : String(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const tip =
  (fmt?: (l: string) => string) =>
  // eslint-disable-next-line react/display-name
  ({ active, payload, label }: { active?: boolean; payload?: readonly TipEntry[]; label?: unknown }) => (
    <Tip active={active} payload={payload} label={label} fmt={fmt} />
  );

export interface CurveDatum {
  date: string;
  planned: number;
  actual: number | null;
}

export function PlannedVsActualChart({ data, today }: { data: CurveDatum[]; today: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={CHART_COLOR.grid} vertical={false} />
        <XAxis
          dataKey="date"
          {...axis}
          tickFormatter={(d: string) => formatDate(d, "d MMM")}
          minTickGap={32}
        />
        <YAxis {...axis} allowDecimals={false} width={44} />
        <Tooltip
          content={tip((d) => formatDate(d, "EEE d MMM"))}
          cursor={{ stroke: CHART_COLOR.grid }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLOR.muted }} iconType="plainline" />
        <Line
          type="stepAfter"
          dataKey="planned"
          name="Planned"
          stroke={CHART_COLOR.planned}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke={CHART_COLOR.accent}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
        {data.some((d) => d.date === today) && (
          <ReferenceLine
            x={today}
            stroke={CHART_COLOR.muted}
            strokeOpacity={0.4}
            label={{ value: "Today", position: "insideTopRight", fill: CHART_COLOR.muted, fontSize: 10 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface WeekDatum {
  label: string;
  easy: number;
  medium: number;
  hard: number;
}

export function WeeklyChart({ data }: { data: WeekDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={CHART_COLOR.grid} vertical={false} />
        <XAxis dataKey="label" {...axis} interval={0} fontSize={10} />
        <YAxis {...axis} allowDecimals={false} width={40} />
        <Tooltip content={tip()} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="easy" name="Easy" stackId="a" fill={CHART_COLOR.easy} isAnimationActive={false} />
        <Bar dataKey="medium" name="Medium" stackId="a" fill={CHART_COLOR.medium} isAnimationActive={false} />
        <Bar dataKey="hard" name="Hard" stackId="a" fill={CHART_COLOR.hard} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface TopicDatum {
  name: string;
  solved: number;
  remaining: number;
}

export function TopicChart({ data }: { data: TopicDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 22 + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap={4}>
        <CartesianGrid stroke={CHART_COLOR.grid} horizontal={false} />
        <XAxis type="number" {...axis} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          {...axis}
          width={150}
          interval={0}
          tickFormatter={(n: string) => (n.length > 22 ? `${n.slice(0, 21)}…` : n)}
        />
        <Tooltip content={tip()} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="solved" name="Solved" stackId="t" fill={CHART_COLOR.accent} isAnimationActive={false} />
        <Bar dataKey="remaining" name="Remaining" stackId="t" fill={CHART_COLOR.grid} radius={[0, 3, 3, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HowDonut({ alone, hint, solution }: { alone: number; hint: number; solution: number }) {
  const total = alone + hint + solution;
  const data = [
    { name: "Alone", value: alone, fill: CHART_COLOR.solved },
    { name: "Hint", value: hint, fill: CHART_COLOR.attempted },
    { name: "Solution", value: solution, fill: CHART_COLOR.hard },
  ];
  return (
    <div className="relative size-35 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={total ? data : [{ name: "None", value: 1, fill: CHART_COLOR.grid }]}
            dataKey="value"
            nameKey="name"
            innerRadius={46}
            outerRadius={64}
            strokeWidth={0}
            isAnimationActive={false}
          />
          {total > 0 && <Tooltip content={tip()} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-lg font-semibold">{total ? `${Math.round((alone / total) * 100)}%` : "–"}</span>
        <span className="text-[10px] text-muted-foreground">alone</span>
      </div>
    </div>
  );
}
