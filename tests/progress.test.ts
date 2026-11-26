import { describe, expect, it } from "vitest";
import {
  computeHeatmap,
  computePace,
  computeStreak,
  heatLevel,
  tierReadiness,
  topicProgress,
  topicScore,
  weakTopics,
  type SolveLike,
} from "@/lib/progress";
import { TIERS } from "@/lib/targets";

const s = (topicId: string | null, difficulty: SolveLike["difficulty"], solvedDate = "2026-12-01"): SolveLike => ({
  topicId,
  difficulty,
  solvedDate,
});

describe("topic progress", () => {
  const target = { easy: 2, medium: 2, hard: 1 };

  it("counts solves of the topic only and caps each level at its target", () => {
    const p = topicProgress("a", [s("a", "easy"), s("a", "easy"), s("a", "easy"), s("b", "hard"), s(null, "medium")], target);
    expect(p.solved).toEqual({ easy: 3, medium: 0, hard: 0, total: 3 });
    // 2 easy (capped) of weight 1, out of 2 + 2*2 + 3*1 = 9
    expect(p.score).toBeCloseTo(2 / 9);
    expect(p.status).toBe("learning");
    expect(p.need).toEqual({ easy: 0, medium: 2, hard: 1 });
  });

  it("is mastered only when every level is met", () => {
    const all = [s("a", "easy"), s("a", "easy"), s("a", "medium"), s("a", "medium"), s("a", "hard")];
    expect(topicProgress("a", all, target).status).toBe("mastered");
    expect(topicProgress("a", all.slice(0, 4), target).status).toBe("almost");
    expect(topicProgress("a", [], target).status).toBe("not-started");
  });

  it("score is 1 when the target is empty", () => {
    expect(topicScore({ easy: 0, medium: 0, hard: 0 }, { easy: 0, medium: 0, hard: 0 })).toBe(1);
  });
});

describe("tier readiness", () => {
  const topics = [
    { id: "x", importance: { tierA: 3, tierB: 3, tierC: 3 } },
    { id: "y", importance: { tierA: 0, tierB: 2, tierC: 3 } },
  ];
  const target = { easy: 0, medium: 2, hard: 0 };
  const progress = (n: number) =>
    new Map([
      ["x", topicProgress("x", Array.from({ length: n }, () => s("x", "medium")), target)],
      ["y", topicProgress("y", [], target)],
    ]);

  it("only counts topics the tier cares about", () => {
    const a = tierReadiness(TIERS[0], topics, progress(1)); // bar 0.5, x at 0.5
    expect(a.required.map((r) => r.topicId)).toEqual(["x"]);
    expect(a.ready).toBe(true);
    expect(a.readiness).toBe(1);
  });

  it("weights by importance and needs every topic at the bar", () => {
    const c = tierReadiness(TIERS[2], topics, progress(2)); // x mastered, y 0
    expect(c.ready).toBe(false);
    expect(c.readiness).toBeCloseTo(0.5);
  });
});

describe("pace", () => {
  it("classifies ahead / on track / behind", () => {
    expect(computePace(10, 12, true).tone).toBe("ahead");
    expect(computePace(10, 9, true).tone).toBe("on-track");
    expect(computePace(10, 4, true).tone).toBe("behind");
    expect(computePace(40, 4, true).tone).toBe("far-behind");
    expect(computePace(0, 0, false).tone).toBe("before");
  });
});

describe("streak and heatmap", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(computeStreak(["2026-12-01", "2026-12-02", "2026-12-03"], "2026-12-03")).toEqual({ current: 3, longest: 3, activeToday: true });
    expect(computeStreak(["2026-12-01", "2026-12-02"], "2026-12-03").current).toBe(2);
    expect(computeStreak(["2026-12-01"], "2026-12-05")).toEqual({ current: 0, longest: 1, activeToday: false });
  });

  it("fills the heatmap and grades levels", () => {
    expect(computeHeatmap(new Map([["2026-12-02", 2]]), "2026-12-01", "2026-12-03").map((c) => c.count)).toEqual([0, 2, 0]);
    expect(heatLevel(0, 4)).toBe(0);
    expect(heatLevel(4, 4)).toBe(4);
  });
});

describe("weak topics", () => {
  it("lists unmastered topics whose dates passed, weakest first", () => {
    const t = { easy: 1, medium: 0, hard: 0 };
    const ps = [topicProgress("a", [], t), topicProgress("b", [s("b", "easy")], t), topicProgress("c", [], { easy: 2, medium: 0, hard: 0 })];
    const ends = new Map([
      ["a", "2026-12-02"],
      ["b", "2026-12-02"],
      ["c", "2026-12-20"],
    ]);
    expect(weakTopics(ps, ends, "2026-12-10").map((p) => p.topicId)).toEqual(["a"]);
  });
});
