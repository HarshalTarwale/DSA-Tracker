"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLOR } from "@/lib/constants";
import { formatDate } from "@/lib/dates";

export interface MockPoint {
  key: string;
  date: string;
  title: string;
  rate: number;
}

export default function MockChart({ data }: { data: MockPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={CHART_COLOR.grid} vertical={false} />
        <XAxis
          dataKey="key"
          stroke={CHART_COLOR.grid}
          tick={{ fill: CHART_COLOR.muted, fontSize: 11 }}
          tickLine={false}
          tickFormatter={(k: string) => formatDate(k.slice(0, 10), "d MMM")}
          minTickGap={24}
        />
        <YAxis
          domain={[0, 100]}
          stroke={CHART_COLOR.grid}
          tick={{ fill: CHART_COLOR.muted, fontSize: 11 }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={48}
        />
        <Tooltip
          cursor={{ stroke: CHART_COLOR.grid }}
          content={({ active, payload }) => {
            const p = active && payload?.[0]?.payload as MockPoint | undefined;
            if (!p) return null;
            return (
              <div className="rounded-lg border border-border bg-card-hover px-3 py-2 text-xs">
                <p className="text-muted-foreground">{formatDate(p.date, "EEE d MMM")}</p>
                <p className="font-medium">{p.title}</p>
                <p className="num text-accent">{p.rate}% solved</p>
              </div>
            );
          }}
        />
        <Line type="monotone" dataKey="rate" name="Solve rate" stroke={CHART_COLOR.accent} strokeWidth={2} dot={{ r: 3, fill: CHART_COLOR.accent }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
