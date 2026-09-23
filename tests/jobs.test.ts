import { describe, expect, it } from "vitest";
import {
  computeStats,
  daysSince,
  draftJob,
  isValidJob,
  toCSV,
  todayISO,
  uid,
  type JobApplication,
} from "../lib/jobs";

const job = (over: Partial<JobApplication> = {}): JobApplication => ({
  ...draftJob(),
  company: "Acme",
  role: "Software Engineer",
  ...over,
});

describe("uid", () => {
  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()));
    expect(ids.size).toBe(50);
  });
});

describe("todayISO", () => {
  it("returns an ISO date (yyyy-mm-dd)", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isValidJob", () => {
  it("requires company and role", () => {
    expect(isValidJob(job())).toBe(true);
    expect(isValidJob(job({ company: "" }))).toBe(false);
    expect(isValidJob(job({ role: "" }))).toBe(false);
    expect(isValidJob(job({ company: "  ", role: "" }))).toBe(false);
  });
});

describe("daysSince", () => {
  it("returns null for empty or invalid dates", () => {
    expect(daysSince("")).toBeNull();
    expect(daysSince("not-a-date")).toBeNull();
  });

  it("is never negative for past or future dates", () => {
    expect(daysSince("1999-01-01")).toBeGreaterThan(0);
    expect(daysSince("2999-01-01")).toBe(0);
  });
});

describe("computeStats", () => {
  it("computes bucket counts and response rate", () => {
    const stats = computeStats([
      job({ status: "wishlist" }),
      job({ status: "applied" }),
      job({ status: "interviewing" }),
      job({ status: "offer" }),
      job({ status: "rejected" }),
    ]);
    expect(stats.total).toBe(5);
    expect(stats.active).toBe(2);
    expect(stats.interviews).toBe(1);
    expect(stats.offers).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.responseRate).toBe(60);
    expect(stats.byStatus.wishlist).toBe(1);
    expect(stats.byStatus.withdrawn).toBe(0);
  });

  it("returns null metrics for an empty pipeline", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.responseRate).toBeNull();
    expect(stats.avgDaysToResponse).toBeNull();
  });
});

describe("toCSV", () => {
  it("emits an unquoted header row and escapes quotes", () => {
    const csv = toCSV([job({ notes: 'said "hello"' })]);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain("Company,Role,Location,Salary,Status,Applied");
    expect(csv).toContain('"said ""hello"""');
  });

  it("maps rejected to its display label", () => {
    const csv = toCSV([job({ status: "rejected" })]);
    expect(csv).toContain("Rejected");
  });
});