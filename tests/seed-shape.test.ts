import { describe, expect, it } from "vitest";
import { seed } from "@/lib/content";
import { dayIndexToDate, planEndDate, weekdayShort } from "@/lib/dates";

const START = seed.meta.defaultStartDate;

describe("seed-data.json shape", () => {
  it("has the documented counts", () => {
    expect(seed.topics).toHaveLength(25);
    expect(seed.problems).toHaveLength(252);
    expect(seed.schedule).toHaveLength(112);
    const by = (d: string) => seed.problems.filter((p) => p.difficulty === d).length;
    expect([by("Easy"), by("Medium"), by("Hard")]).toEqual([58, 162, 32]);
  });

  it("has unique LC numbers and dayIndexes 0..111", () => {
    expect(new Set(seed.problems.map((p) => p.lcNumber)).size).toBe(252);
    expect(seed.schedule.map((d) => d.dayIndex)).toEqual(Array.from({ length: 112 }, (_, i) => i));
  });

  it("every scheduled problem exists and every problem is scheduled exactly once", () => {
    const lc = new Set(seed.problems.map((p) => p.lcNumber));
    const scheduled = seed.schedule.flatMap((d) => d.problemIds);
    expect(scheduled.every((n) => lc.has(n))).toBe(true);
    expect(scheduled).toHaveLength(252);
    expect(new Set(scheduled).size).toBe(252);
  });

  it("topic references are valid and dailyFocus matches study days", () => {
    const ids = new Set(seed.topics.map((t) => t.id));
    for (const p of seed.problems) expect(ids.has(p.topicId)).toBe(true);
    for (const t of seed.topics) {
      const days = seed.schedule.filter((d) => d.type === "study" && d.topicId === t.id);
      expect(days.length).toBe(t.dailyFocus.length);
    }
    for (const d of seed.schedule) {
      if (d.type === "study") expect(d.topicId && ids.has(d.topicId)).toBeTruthy();
      else expect(d.problemIds).toEqual([]);
    }
  });

  it("matches the acceptance-criteria anchors for the default start date", () => {
    const d0 = seed.schedule[0];
    expect(d0.type).toBe("study");
    expect(d0.title).toBe("Python, Big-O & Basic Logic");
    expect(d0.problemIds).toEqual([1480, 1295, 1672, 412]);
    expect(weekdayShort(dayIndexToDate(START, 0))).toBe("Thu");

    expect(seed.schedule[3].type).toBe("review");
    expect(weekdayShort(dayIndexToDate(START, 3))).toBe("Sun");

    expect(seed.schedule[24].type).toBe("mock");
    expect(dayIndexToDate(START, 24)).toBe("2026-11-29");

    expect(planEndDate(START, 112)).toBe("2027-02-24");
    expect(seed.meta.mockDayIndexes.every((i) => seed.schedule[i].type === "mock")).toBe(true);
  });
});
