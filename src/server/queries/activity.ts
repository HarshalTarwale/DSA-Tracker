import "server-only";
import { cache } from "react";
import { count, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { activityEvents } = schema;

/**
 * Counted events per IST date: status changes to solved/revised, and redo completions.
 * One aggregated query; feeds both the streak and the heatmap.
 */
export const getEventCountsByDate = cache(async (): Promise<Map<string, number>> => {
  const rows = await getDb()
    .select({ date: activityEvents.eventDate, n: count() })
    .from(activityEvents)
    .where(
      or(
        eq(activityEvents.type, "redo_done"),
        inArray(activityEvents.toStatus, ["solved", "revised"]),
      ),
    )
    .groupBy(activityEvents.eventDate);
  return new Map(rows.map((r) => [r.date, r.n]));
});
