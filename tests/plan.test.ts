import { describe, expect, it } from "vitest";
import { curatedProblems, DEFAULT_END_DATE, DEFAULT_START_DATE, topics } from "@/lib/content";
import { allocate, buildPlan, dayTotal, expectedThrough, FINAL_DAYS, mondayOf, spreadTarget, topicBlocks, weekday, weekNumber } from "@/lib/plan";
import { TOPIC_TARGETS, totalTarget } from "@/lib/targets";

const plan = buildPlan(DEFAULT_START_DATE, DEFAULT_END_DATE, topics, TOPIC_TARGETS, curatedProblems);

describe("buildPlan for 1 Dec 2026 → 1 Apr 2027", () => {
  it("covers every day", () => {
    expect(plan).toHaveLength(122);
    expect(plan[0].date).toBe("2026-12-01");
    expect(plan.at(-1)!.date).toBe("2027-04-01");
  });

  it("starts with Python basics as a learn day", () => {
    expect(plan[0]).toMatchObject({ kind: "study", topicId: "python-big-o-basic-logic", step: "learn", topicDay: 0 });
    expect(plan[0].suggested).toContain("running-sum-of-1d-array");
  });

  it("makes Sundays review days and the last days final revision", () => {
    expect(plan.find((d) => d.date === "2026-12-06")!.kind).toBe("review");
    for (const d of plan.slice(0, -FINAL_DAYS)) expect(d.kind === "review").toBe(weekday(d.date) === 0);
    expect(plan.slice(-FINAL_DAYS).every((d) => d.kind === "final")).toBe(true);
  });

  it("schedules all 25 topics in order, each in one block", () => {
    const blocks = topicBlocks(plan);
    expect(blocks.map((b) => b.topicId)).toEqual(topics.map((t) => t.id));
    for (const b of blocks) {
      const days = plan.filter((d) => d.topicId === b.topicId);
      expect(days.map((d) => d.topicDay)).toEqual(days.map((_, i) => i));
      expect(days.length).toBeGreaterThanOrEqual(topics.find((t) => t.id === b.topicId)!.plannedDays);
    }
  });

  it("spreads exactly the mastery targets over study days", () => {
    const study = plan.filter((d) => d.kind === "study");
    const sum = study.reduce(
      (a, d) => ({ easy: a.easy + d.target.easy, medium: a.medium + d.target.medium, hard: a.hard + d.target.hard }),
      { easy: 0, medium: 0, hard: 0 },
    );
    const t = totalTarget();
    expect(sum).toEqual({ easy: t.easy, medium: t.medium, hard: t.hard });
    expect(t.total).toBe(381);
  });

  it("suggests every curated problem exactly once, inside its own topic", () => {
    const all = plan.flatMap((d) => d.suggested.map((s) => ({ s, topic: d.topicId })));
    expect(all).toHaveLength(curatedProblems.length);
    expect(new Set(all.map((x) => x.s)).size).toBe(curatedProblems.length);
    const bySlug = new Map(curatedProblems.map((p) => [p.slug, p.topicId]));
    for (const x of all) expect(x.topic).toBe(bySlug.get(x.s));
  });

  it("numbers weeks Monday → Sunday", () => {
    expect(weekNumber(DEFAULT_START_DATE, "2026-12-01")).toBe(1);
    expect(weekNumber(DEFAULT_START_DATE, "2026-12-06")).toBe(1);
    expect(weekNumber(DEFAULT_START_DATE, "2026-12-07")).toBe(2);
    expect(mondayOf("2026-12-06")).toBe("2026-11-30");
  });

  it("accumulates expected solves", () => {
    expect(expectedThrough(plan, "2026-11-30")).toBe(0);
    expect(expectedThrough(plan, "2026-12-01")).toBe(dayTotal(plan[0].target));
    expect(expectedThrough(plan, "2027-04-01")).toBe(plan.reduce((a, d) => a + dayTotal(d.target), 0));
  });

  it("reshapes when dates change", () => {
    const short = buildPlan("2027-01-04", "2027-02-28", topics, TOPIC_TARGETS, curatedProblems);
    expect(short).toHaveLength(56);
    expect(topicBlocks(short)).toHaveLength(25);
  });
});

describe("helpers", () => {
  it("allocate keeps the total and gives everyone at least 1", () => {
    const out = allocate(30, [2, 3, 7, 1]);
    expect(out.reduce((a, b) => a + b, 0)).toBe(30);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(1);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
  });

  it("spreadTarget goes easy → hard and keeps counts", () => {
    const s = spreadTarget({ easy: 2, medium: 4, hard: 2 }, 4);
    expect(s[0]).toEqual({ easy: 2, medium: 0, hard: 0 });
    expect(s[3].hard).toBe(2);
    expect(s.reduce((a, d) => a + dayTotal(d), 0)).toBe(8);
  });
});
