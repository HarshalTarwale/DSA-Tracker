import type { Metadata } from "next";
import { topicById } from "@/lib/content";
import { getAppData } from "@/server/data";
import { PageHeader } from "@/components/shared/page";
import { SolvedList } from "@/components/solved/solved-list";

export const metadata: Metadata = { title: "Solved" };
export const dynamic = "force-dynamic";

export default async function SolvedPage({ searchParams }: PageProps<"/solved">) {
  const [{ solves, settings }, sp] = await Promise.all([getAppData(), searchParams]);
  const topic = typeof sp.topic === "string" && topicById.has(sp.topic) ? sp.topic : undefined;
  const platforms = [settings.leetcodeUsername && `LeetCode (${settings.leetcodeUsername})`, settings.hackerrankUsername && `HackerRank (${settings.hackerrankUsername})`].filter(Boolean);
  return (
    <>
      <PageHeader
        title="Solved"
        description={
          platforms.length
            ? `Pulled automatically from ${platforms.join(" and ")}. The topic is detected from the problem's tags; change it if it's wrong.`
            : "Connect LeetCode or HackerRank in Settings and every accepted problem shows up here."
        }
      />
      <SolvedList solves={solves} initialTopic={topic} />
    </>
  );
}
