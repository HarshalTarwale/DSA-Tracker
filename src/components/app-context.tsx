"use client";

import { createContext, useContext } from "react";
import type { TopicOption } from "@/lib/types";

export interface SyncInfo {
  connected: boolean;
  /** ISO time of the last sync, or null */
  lastSyncedAt: string | null;
  error: string | null;
  stale: boolean;
}

export interface AppContextValue {
  today: string;
  topics: TopicOption[];
  sync: SyncInfo;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function useTopicName() {
  const { topics } = useApp();
  const map = new Map(topics.map((t) => [t.id, t.name]));
  return (id: string | null | undefined) => (id ? (map.get(id) ?? id) : "Other");
}
