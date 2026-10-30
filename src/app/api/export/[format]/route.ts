import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PLAN_DAYS } from "@/lib/content";
import {
  DAY_STATUS_LABEL,
  DAY_TYPE_LABEL,
  DIFFICULTY_LABEL,
  HOW_LABEL,
  STATUS_LABEL,
} from "@/lib/constants";
import { addDays, todayIST, weekdayShort, weekOf } from "@/lib/dates";
import { computeKpis, computeRedoState, computeTopicStats, sumTopicStats } from "@/lib/metrics";
import { hasValidSession } from "@/server/auth";
import { buildBackup } from "@/server/backup";
import { getProblems } from "@/server/queries/problems";
import { getDayLogs, getSchedule } from "@/server/queries/schedule";
import { getSettings } from "@/server/queries/settings";
import { getTopics } from "@/server/queries/topics";
import { getMistakes, getMocks } from "@/server/queries/journal";

export const dynamic = "force-dynamic";

function attachment(body: BodyInit, type: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/export/[format]">) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { format } = await ctx.params;
  const stamp = todayIST();

  if (format === "json") {
    const backup = await buildBackup();
    return attachment(
      JSON.stringify(backup, null, 2),
      "application/json; charset=utf-8",
      `dsa-tracker-backup-${stamp}.json`,
    );
  }

  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Unknown format. Use json, xlsx or csv." }, { status: 404 });
  }

  const [problems, topics, settings] = await Promise.all([getProblems(), getTopics(), getSettings()]);
  const topicName = new Map(topics.map((t) => [t.id, t.name]));
  const today = todayIST();

  const problemRows = problems.map((p) => {
    const redo = computeRedoState(p, today);
    return {
      order: p.order,
      topic: topicName.get(p.topicId) ?? p.topicId,
      lc: p.lcNumber ?? "",
      title: p.title,
      url: p.url ?? "",
      difficulty: DIFFICULTY_LABEL[p.difficulty],
      keyIdea: p.keyIdea ?? "",
      planDay: p.dayIndex === null ? "" : p.dayIndex + 1,
      planDate: p.dayIndex === null ? "" : addDays(settings.startDate, p.dayIndex),
      status: STATUS_LABEL[p.status],
      solvedAt: p.solvedAt ?? "",
      how: p.how ? HOW_LABEL[p.how] : "",
      timeMinutes: p.timeMinutes ?? "",
      redo: p.redoFlag ? "Yes" : "",
      redo1Due: redo.stages?.[0].dueDate ?? "",
      redo1Done: p.redo1DoneAt ?? "",
      redo7Due: redo.stages?.[1].dueDate ?? "",
      redo7Done: p.redo7DoneAt ?? "",
      redo30Due: redo.stages?.[2].dueDate ?? "",
      redo30Done: p.redo30DoneAt ?? "",
      custom: p.isCustom ? "Yes" : "",
      notes: p.notes ?? "",
    };
  });

  const problemColumns: { header: string; key: keyof (typeof problemRows)[number]; width: number }[] = [
    { header: "#", key: "order", width: 6 },
    { header: "Topic", key: "topic", width: 28 },
    { header: "LC #", key: "lc", width: 8 },
    { header: "Title", key: "title", width: 40 },
    { header: "URL", key: "url", width: 40 },
    { header: "Difficulty", key: "difficulty", width: 10 },
    { header: "Key idea", key: "keyIdea", width: 40 },
    { header: "Plan day", key: "planDay", width: 9 },
    { header: "Plan date", key: "planDate", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Date solved", key: "solvedAt", width: 12 },
    { header: "How", key: "how", width: 10 },
    { header: "Time (min)", key: "timeMinutes", width: 10 },
    { header: "Redo?", key: "redo", width: 7 },
    { header: "Redo +1 due", key: "redo1Due", width: 12 },
    { header: "Redo +1 done", key: "redo1Done", width: 12 },
    { header: "Redo +7 due", key: "redo7Due", width: 12 },
    { header: "Redo +7 done", key: "redo7Done", width: 12 },
    { header: "Redo +30 due", key: "redo30Due", width: 12 },
    { header: "Redo +30 done", key: "redo30Done", width: 12 },
    { header: "Custom", key: "custom", width: 8 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  if (format === "csv") {
    const lines = [
      problemColumns.map((c) => csvCell(c.header)).join(","),
      ...problemRows.map((r) => problemColumns.map((c) => csvCell(r[c.key])).join(",")),
    ];
    return attachment(
      "﻿" + lines.join("\r\n"),
      "text/csv; charset=utf-8",
      `dsa-tracker-problems-${stamp}.csv`,
    );
  }

  // XLSX
  const [schedule, dayLogs, mistakes, mocks] = await Promise.all([
    getSchedule(),
    getDayLogs(),
    getMistakes(),
    getMocks(),
  ]);
  const stats = computeTopicStats(topics, problems, schedule, settings.startDate);
  const totals = sumTopicStats(stats);
  const kpis = computeKpis(problems, settings.startDate, PLAN_DAYS, today);
  const lcById = new Map(problems.map((p) => [p.id, p]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "DSA Tracker";
  wb.created = new Date();

  const bold = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // Dashboard summary
  const dash = wb.addWorksheet("Dashboard");
  dash.addRow(["DSA Tracker — exported", stamp]);
  dash.addRow(["Start date", settings.startDate, "Plan end", kpis.endDate]);
  dash.addRow(["Solved / Target", `${kpis.solved.total} / ${kpis.target.total}`, "Overall %", Math.round(kpis.pct * 1000) / 10]);
  dash.addRow(["Days left", kpis.daysLeft, "Pace needed / day", kpis.paceNeeded]);
  dash.addRow([]);
  const header = dash.addRow([
    "#", "Topic", "Priority", "Start", "End", "Study days",
    "Target E", "Target M", "Target H", "Target total",
    "Solved E", "Solved M", "Solved H", "Solved total",
    "% complete", "Remaining", "Status",
  ]);
  header.font = { bold: true };
  stats.forEach((s, i) => {
    const t = topics[i];
    dash.addRow([
      t.order, t.name, t.priority, s.startDate ?? "", s.endDate ?? "", s.studyDays,
      s.target.easy, s.target.medium, s.target.hard, s.target.total,
      s.solved.easy, s.solved.medium, s.solved.hard, s.solved.total,
      Math.round(s.pct * 1000) / 10, s.remaining, s.status,
    ]);
  });
  dash.addRow([
    "", "Total", "", "", "", totals.studyDays,
    totals.target.easy, totals.target.medium, totals.target.hard, totals.target.total,
    totals.solved.easy, totals.solved.medium, totals.solved.hard, totals.solved.total,
    Math.round(totals.pct * 1000) / 10, totals.remaining, "",
  ]).font = { bold: true };
  dash.getColumn(2).width = 32;

  // Problems
  const pws = wb.addWorksheet("Problems");
  pws.columns = problemColumns;
  problemRows.forEach((r) => pws.addRow(r));
  bold(pws);

  // Schedule
  const sws = wb.addWorksheet("Schedule");
  sws.columns = [
    { header: "Day", key: "day", width: 6 },
    { header: "Week", key: "week", width: 6 },
    { header: "Date", key: "date", width: 12 },
    { header: "Weekday", key: "weekday", width: 8 },
    { header: "Type", key: "type", width: 8 },
    { header: "Phase", key: "phase", width: 20 },
    { header: "Topic", key: "topic", width: 28 },
    { header: "Focus", key: "focus", width: 60 },
    { header: "Problems", key: "problems", width: 30 },
    { header: "Done?", key: "status", width: 9 },
    { header: "Hours", key: "hours", width: 7 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  for (const d of schedule) {
    const date = addDays(settings.startDate, d.dayIndex);
    const log = dayLogs.get(d.dayIndex);
    sws.addRow({
      day: d.dayIndex + 1,
      week: weekOf(d.dayIndex),
      date,
      weekday: weekdayShort(date),
      type: DAY_TYPE_LABEL[d.type],
      phase: d.phase,
      topic: d.topicId ? (topicName.get(d.topicId) ?? d.title) : d.title,
      focus: d.focus,
      problems: d.problemIds.map((id) => lcById.get(id)?.lcNumber ?? id).join(", "),
      status: log?.status ? DAY_STATUS_LABEL[log.status] : "",
      hours: log?.hoursSpent ?? "",
      notes: log?.notes ?? "",
    });
  }
  bold(sws);

  // Mistakes
  const mws = wb.addWorksheet("Mistakes");
  mws.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Problem", key: "problem", width: 36 },
    { header: "Topic", key: "topic", width: 28 },
    { header: "Pattern / trigger", key: "trigger", width: 36 },
    { header: "What went wrong", key: "wrong", width: 48 },
    { header: "Correct idea", key: "idea", width: 48 },
    { header: "Re-solved", key: "resolved", width: 10 },
  ];
  for (const m of mistakes) {
    mws.addRow({
      date: m.date,
      problem: m.problemId ? (lcById.get(m.problemId)?.title ?? m.problemTitle) : m.problemTitle,
      topic: m.topicId ? (topicName.get(m.topicId) ?? "") : "",
      trigger: m.trigger ?? "",
      wrong: m.whatWentWrong ?? "",
      idea: m.correctIdea ?? "",
      resolved: m.resolved ? "Yes" : "No",
    });
  }
  bold(mws);

  // Mocks
  const kws = wb.addWorksheet("Mocks");
  kws.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Title", key: "title", width: 30 },
    { header: "Attempted", key: "attempted", width: 10 },
    { header: "Solved", key: "solved", width: 8 },
    { header: "Solve rate %", key: "rate", width: 12 },
    { header: "Duration (min)", key: "duration", width: 14 },
    { header: "Topics", key: "topics", width: 40 },
    { header: "What went wrong", key: "wrong", width: 40 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  for (const m of mocks) {
    kws.addRow({
      date: m.date,
      title: m.title,
      attempted: m.attempted,
      solved: m.solved,
      rate: m.attempted ? Math.round((m.solved / m.attempted) * 100) : "",
      duration: m.durationMinutes ?? "",
      topics: m.topicIds.map((id) => topicName.get(id) ?? id).join(", "),
      wrong: m.whatWentWrong ?? "",
      notes: m.notes ?? "",
    });
  }
  bold(kws);

  const buf = await wb.xlsx.writeBuffer();
  return attachment(
    new Uint8Array(buf as ArrayBuffer),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `dsa-tracker-${stamp}.xlsx`,
  );
}
