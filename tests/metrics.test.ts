import { describe, expect, it } from "vitest";
import {
  bucketRedo,
  computeAvgMinutes,
  computeCurve,
  computeHeatmap,
  computeHowBreakdown,
  computeKpis,
  computeOnTrack,
  computePlanCurve,
  computeRedoState,
  computeStreak,
  computeTopicStats,
  computeWeakSpots,
  computeWeekly,
  heatLevel,
  isDone,
  paceNeeded,
  sumTopicStats,
  topicStatus,
  type ProblemLike,
  type ScheduleDayLike,
} from "@/lib/metrics";

const START = "2026-11-05";

function p(id: number, over: Partial<ProblemLike> = {}): ProblemLike {
  return {
    id,
    difficulty: "easy",
    topicId: "a",
    isCustom: false,
    status: "not_started",
    solvedAt: null,
    how: null,
    timeMinutes: null,
    redoFlag: false,
    redo1DoneAt: null,
    redo7DoneAt: null,
    redo30DoneAt: null,
    ...over,
  };
}

const topics = [
  { id: "a", order: 1 },
  { id: "b", order: 2 },
];

// day 0: a [1,2], day 1: a [3], day 2: review, day 3: b [4,5]
const schedule: ScheduleDayLike[] = [
  { dayIndex: 0, type: "study", topicId: "a", problemIds: [1, 2] },
  { dayIndex: 1, type: "study", topicId: "a", problemIds: [3] },
  { dayIndex: 2, type: "review", topicId: null, problemIds: [] },
  { dayIndex: 3, type: "study", topicId: "b", problemIds: [4, 5] },
];

describe("isDone", () => {
  it("counts only solved and revised", () => {
    expect(isDone({ status: "solved" })).toBe(true);
    expect(isDone({ status: "revised" })).toBe(true);
    expect(isDone({ status: "attempted" })).toBe(false);
    expect(isDone({ status: "not_started" })).toBe(false);
  });
});

describe("topic aggregation", () => {
  const problems = [
    p(1, { difficulty: "easy", status: "solved", solvedAt: START }),
    p(2, { difficulty: "medium", status: "attempted" }),
    p(3, { difficulty: "hard", status: "revised", solvedAt: START }),
    p(4, { topicId: "b", difficulty: "medium" }),
    p(5, { topicId: "b", difficulty: "medium" }),
    p(6, { topicId: "b", difficulty: "easy", isCustom: true, status: "solved", solvedAt: START }),
  ];
  const stats = computeTopicStats(topics, problems, schedule, START);

  it("computes target/solved by difficulty including custom problems", () => {
    expect(stats[0].target).toEqual({ easy: 1, medium: 1, hard: 1, total: 3 });
    expect(stats[0].solved).toEqual({ easy: 1, medium: 0, hard: 1, total: 2 });
    expect(stats[1].target).toEqual({ easy: 1, medium: 2, hard: 0, total: 3 });
    expect(stats[1].solved.total).toBe(1);
  });

  it("computes %, remaining, status and dates", () => {
    expect(stats[0].pct).toBeCloseTo(2 / 3);
    expect(stats[0].remaining).toBe(1);
    expect(stats[0].status).toBe("In progress");
    expect(stats[0].startDate).toBe("2026-11-05");
    expect(stats[0].endDate).toBe("2026-11-06");
    expect(stats[0].studyDays).toBe(2);
    expect(stats[1].startDate).toBe("2026-11-08");
    expect(stats[1].studyDays).toBe(1);
  });

  it("topic status rules", () => {
    expect(topicStatus(0, 5)).toBe("Not started");
    expect(topicStatus(5, 5)).toBe("Completed");
    expect(topicStatus(6, 5)).toBe("Completed");
    expect(topicStatus(2, 5)).toBe("In progress");
  });

  it("totals", () => {
    const t = sumTopicStats(stats);
    expect(t.target.total).toBe(6);
    expect(t.solved.total).toBe(3);
    expect(t.remaining).toBe(3);
    expect(t.studyDays).toBe(3);
  });

  it("0% when target is 0", () => {
    const s = computeTopicStats([{ id: "z", order: 1 }], [], [], START);
    expect(s[0].pct).toBe(0);
    expect(s[0].startDate).toBeNull();
  });
});

describe("KPIs and pace", () => {
  it("computes end date, days left and pace", () => {
    const problems = [p(1, { status: "solved" }), p(2), p(3, { difficulty: "hard" })];
    const k = computeKpis(problems, START, 112, "2027-02-14");
    expect(k.endDate).toBe("2027-02-24");
    expect(k.daysLeft).toBe(10);
    expect(k.remaining).toBe(2);
    expect(k.paceNeeded).toBe(0.2);
    expect(k.target.hard).toBe(1);
    expect(k.solved.easy).toBe(1);
  });

  it("guards divide by zero and clamps days left", () => {
    const k = computeKpis([p(1)], START, 112, "2027-03-10");
    expect(k.daysLeft).toBe(0);
    expect(k.paceNeeded).toBe(0);
    expect(paceNeeded(10, 3)).toBe(3.3);
  });
});

describe("ahead / behind", () => {
  it("counts planned problems scheduled before today", () => {
    const problems = [1, 2, 3, 4, 5].map((id) => p(id));
    problems[0].status = "solved";
    // today = day 3 → planned by yesterday = days 0,1 = 3 problems
    const r = computeOnTrack(problems, schedule, 3);
    expect(r.plannedByYesterday).toBe(3);
    expect(r.solvedPlanned).toBe(1);
    expect(r.delta).toBe(-2);
    expect(r.tone).toBe("behind");
    expect(r.extraPerDay).toBe(1);
  });

  it("ignores custom problems", () => {
    const problems = [p(1, { status: "solved" }), p(99, { isCustom: true, status: "solved" })];
    const r = computeOnTrack(problems, schedule, 1);
    expect(r.plannedByYesterday).toBe(1);
    expect(r.solvedPlanned).toBe(1);
    expect(r.tone).toBe("on-track");
  });

  it("ahead, far behind and not started", () => {
    expect(computeOnTrack([p(1, { status: "solved" })], schedule, 0).tone).toBe("ahead");
    const many: ScheduleDayLike[] = [
      { dayIndex: 0, type: "study", topicId: "a", problemIds: Array.from({ length: 12 }, (_, i) => i + 1) },
    ];
    const ps = Array.from({ length: 12 }, (_, i) => p(i + 1));
    const r = computeOnTrack(ps, many, 1);
    expect(r.delta).toBe(-12);
    expect(r.tone).toBe("far-behind");
    expect(r.extraPerDay).toBe(2);
    const pre = computeOnTrack(ps, many, -3);
    expect(pre.tone).toBe("not-started");
    expect(pre.daysUntilStart).toBe(3);
  });
});

describe("plan curve and actual", () => {
  const problems = [
    p(1, { status: "solved", solvedAt: "2026-11-05" }),
    p(2, { status: "revised", solvedAt: "2026-11-07" }),
    p(3, { status: "attempted", solvedAt: "2026-11-05" }), // not done → not counted
    p(4),
    p(5),
    p(7, { isCustom: true, status: "solved", solvedAt: "2026-11-05" }), // custom → excluded
  ];

  it("cumulative planned per day", () => {
    expect(computePlanCurve(schedule, problems, 5)).toEqual([2, 3, 3, 5, 5]);
  });

  it("cumulative actual up to today only", () => {
    const c = computeCurve(schedule, problems, START, 5, "2026-11-07");
    expect(c.map((x) => x.actual)).toEqual([1, 1, 2, null, null]);
    expect(c[3].date).toBe("2026-11-08");
    expect(c[4].planned).toBe(5);
  });

  it("counts pre-plan solves from day 0", () => {
    const c = computeCurve(schedule, [p(1, { status: "solved", solvedAt: "2026-10-01" })], START, 2, "2026-11-06");
    expect(c[0].actual).toBe(1);
  });
});

describe("weekly buckets", () => {
  it("buckets by plan week and difficulty, with Pre-plan", () => {
    const problems = [
      p(1, { status: "solved", solvedAt: "2026-11-05" }),
      p(2, { status: "solved", solvedAt: "2026-11-11", difficulty: "hard" }),
      p(3, { status: "solved", solvedAt: "2026-11-12", difficulty: "medium" }),
      p(4, { status: "solved", solvedAt: "2026-11-01" }),
      p(5, { status: "attempted", solvedAt: "2026-11-05" }),
    ];
    const w = computeWeekly(problems, START, 3);
    expect(w.map((b) => b.label)).toEqual(["Pre-plan", "W1", "W2", "W3"]);
    expect(w[0].easy).toBe(1);
    expect(w[1]).toMatchObject({ easy: 1, hard: 1, medium: 0 });
    expect(w[2]).toMatchObject({ medium: 1 });
  });
});

describe("redo state", () => {
  const D = "2026-11-10";
  it("derives due dates at +1/+7/+30", () => {
    const r = computeRedoState(p(1, { status: "solved", solvedAt: D, redoFlag: true }), D);
    expect(r.stages?.map((s) => s.dueDate)).toEqual(["2026-11-11", "2026-11-17", "2026-12-10"]);
    expect(r.inQueue).toBe(true);
    expect(r.nextStage).toBe(1);
    expect(r.isDue).toBe(false);
  });

  it("due today vs overdue", () => {
    const prob = p(1, { status: "solved", solvedAt: D, redoFlag: true });
    expect(computeRedoState(prob, "2026-11-11")).toMatchObject({ isDue: true, isOverdue: false });
    expect(computeRedoState(prob, "2026-11-12")).toMatchObject({ isDue: true, isOverdue: true });
  });

  it("next stage is the earliest not done", () => {
    const r = computeRedoState(
      p(1, { solvedAt: D, redoFlag: true, redo1DoneAt: "2026-11-11" }),
      "2026-11-17",
    );
    expect(r.nextStage).toBe(7);
    expect(r.isDue).toBe(true);
  });

  it("not in queue without flag or solvedAt; mastered when all done", () => {
    expect(computeRedoState(p(1, { solvedAt: D }), D).inQueue).toBe(false);
    expect(computeRedoState(p(1, { redoFlag: true }), D).inQueue).toBe(false);
    const m = computeRedoState(
      p(1, { solvedAt: D, redoFlag: true, redo1DoneAt: D, redo7DoneAt: D, redo30DoneAt: D }),
      D,
    );
    expect(m.inQueue).toBe(false);
    expect(m.mastered).toBe(true);
  });

  it("buckets overdue / today / upcoming", () => {
    const ps = [
      p(1, { solvedAt: "2026-11-01", redoFlag: true }), // due 11-02 → overdue
      p(2, { solvedAt: "2026-11-09", redoFlag: true }), // due 11-10 → today
      p(3, { solvedAt: "2026-11-12", redoFlag: true }), // due 11-13 → upcoming
      p(4, { solvedAt: "2026-11-30", redoFlag: true }), // due 12-01 → beyond 7 days
    ];
    const b = bucketRedo(ps, "2026-11-10");
    expect(b.overdue.map((x) => x.id)).toEqual([1]);
    expect(b.dueToday.map((x) => x.id)).toEqual([2]);
    expect(b.upcoming.map((x) => x.id)).toEqual([3]);
  });
});

describe("streaks", () => {
  it("counts through today when active", () => {
    const s = computeStreak(["2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-10");
    expect(s).toEqual({ current: 3, longest: 3, activeToday: true });
  });

  it("counts up to yesterday when today has no events yet", () => {
    const s = computeStreak(["2026-11-08", "2026-11-09"], "2026-11-10");
    expect(s.current).toBe(2);
    expect(s.activeToday).toBe(false);
  });

  it("breaks on a gap and tracks longest", () => {
    const s = computeStreak(
      ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-08", "2026-11-10"],
      "2026-11-10",
    );
    expect(s.current).toBe(1);
    expect(s.longest).toBe(4);
    expect(computeStreak([], "2026-11-10")).toEqual({ current: 0, longest: 0, activeToday: false });
  });
});

describe("heatmap and solve style", () => {
  it("fills every date", () => {
    const h = computeHeatmap(new Map([["2026-11-06", 3]]), "2026-11-05", "2026-11-07");
    expect(h).toEqual([
      { date: "2026-11-05", count: 0 },
      { date: "2026-11-06", count: 3 },
      { date: "2026-11-07", count: 0 },
    ]);
    expect(heatLevel(0, 5)).toBe(0);
    expect(heatLevel(1, 1)).toBe(4);
    expect(heatLevel(5, 5)).toBe(4);
    expect(heatLevel(1, 8)).toBe(1);
  });

  it("how breakdown and average minutes for done problems only", () => {
    const ps = [
      p(1, { status: "solved", how: "alone", timeMinutes: 20 }),
      p(2, { status: "revised", how: "hint", timeMinutes: 40 }),
      p(3, { status: "attempted", how: "solution", timeMinutes: 90 }),
      p(4, { status: "solved", difficulty: "hard" }),
    ];
    expect(computeHowBreakdown(ps)).toEqual({ alone: 1, hint: 1, solution: 0, unknown: 1 });
    expect(computeAvgMinutes(ps)).toEqual({ easy: 30, medium: null, hard: null });
  });

  it("weak spots: ended topics by lowest %, else current", () => {
    const ps = [p(1, { status: "solved" }), p(2), p(3), p(4, { topicId: "b" }), p(5, { topicId: "b" })];
    const stats = computeTopicStats(topics, ps, schedule, START);
    const before = computeWeakSpots(stats, "2026-11-05");
    expect(before.mode).toBe("current");
    expect(before.topics.map((t) => t.topicId)).toEqual(["a"]);
    const after = computeWeakSpots(stats, "2026-11-20");
    expect(after.mode).toBe("ended");
    expect(after.topics.map((t) => t.topicId)).toEqual(["b", "a"]);
  });
});
