"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Recharts is client-only and loaded lazily so it stays out of the first-load bundle. */
const fallback = (h: number) => {
  const Fallback = () => <Skeleton className="w-full" style={{ height: h }} />;
  return Fallback;
};

export const PlannedVsActualChart = dynamic(() => import("./charts").then((m) => m.PlannedVsActualChart), {
  ssr: false,
  loading: fallback(260),
});
export const WeeklyChart = dynamic(() => import("./charts").then((m) => m.WeeklyChart), {
  ssr: false,
  loading: fallback(220),
});
export const TopicChart = dynamic(() => import("./charts").then((m) => m.TopicChart), {
  ssr: false,
  loading: fallback(574),
});
export const HowDonut = dynamic(() => import("./charts").then((m) => m.HowDonut), {
  ssr: false,
  loading: () => <Skeleton className="size-35 rounded-full" />,
});
