import { describe, expect, it } from "vitest";
import {
  addDays,
  dateToDayIndex,
  dayIndexToDate,
  diffDays,
  formatDate,
  getTodayIndex,
  isDateString,
  planEndDate,
  todayIST,
  weekLabel,
  weekOf,
  weekdayShort,
} from "@/lib/dates";

const START = "2026-11-05";

describe("todayIST", () => {
  it("returns the IST calendar date, not UTC", () => {
    // 2026-11-04 18:29 UTC = 23:59 IST on 4 Nov
    expect(todayIST(new Date("2026-11-04T18:29:00Z"))).toBe("2026-11-04");
    // 2026-11-04 18:30 UTC = 00:00 IST on 5 Nov (right after midnight IST)
    expect(todayIST(new Date("2026-11-04T18:30:00Z"))).toBe("2026-11-05");
    expect(todayIST(new Date("2026-11-05T12:00:00Z"))).toBe("2026-11-05");
  });
});

describe("date arithmetic", () => {
  it("adds and diffs calendar days across months and years", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(diffDays("2027-01-01", "2026-12-31")).toBe(1);
    expect(diffDays("2026-11-05", "2026-11-12")).toBe(-7);
  });

  it("maps dayIndex <-> date", () => {
    expect(dayIndexToDate(START, 0)).toBe("2026-11-05");
    expect(dayIndexToDate(START, 3)).toBe("2026-11-08");
    expect(dayIndexToDate(START, 24)).toBe("2026-11-29");
    expect(dateToDayIndex(START, "2026-11-29")).toBe(24);
    expect(getTodayIndex(START, "2026-11-01")).toBe(-4);
  });

  it("computes the plan end date", () => {
    expect(planEndDate(START, 112)).toBe("2027-02-24");
    expect(weekdayShort("2027-02-24")).toBe("Wed");
    expect(weekdayShort(START)).toBe("Thu");
    expect(weekdayShort("2026-11-08")).toBe("Sun");
  });

  it("labels weeks", () => {
    expect(weekOf(0)).toBe(1);
    expect(weekOf(6)).toBe(1);
    expect(weekOf(7)).toBe(2);
    expect(weekOf(111)).toBe(16);
    expect(weekLabel(START, 1)).toBe("Week 1 · 5–11 Nov");
    expect(weekLabel(START, 4)).toBe("Week 4 · 26 Nov – 2 Dec");
  });

  it("formats independent of machine timezone", () => {
    expect(formatDate("2026-11-05")).toBe("5 Nov 2026");
    expect(formatDate("2027-01-01", "EEE d MMM")).toBe("Fri 1 Jan");
  });

  it("validates date strings", () => {
    expect(isDateString("2026-11-05")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("05-11-2026")).toBe(false);
    expect(isDateString(null)).toBe(false);
  });
});
