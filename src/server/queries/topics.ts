import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { TopicDTO, TopicOption } from "@/lib/types";

export const getTopics = cache(async (): Promise<TopicDTO[]> => {
  return getDb().select().from(schema.topics).orderBy(asc(schema.topics.order));
});

export function toTopicOptions(topics: TopicDTO[]): TopicOption[] {
  return topics.map((t) => ({ id: t.id, name: t.name, order: t.order }));
}
