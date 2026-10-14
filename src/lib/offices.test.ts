import { describe, expect, it } from "vitest";
import { addDays, bodyReport, deadlineBucket, monthGrid, monthRange, statusLabel } from "./offices";

describe("offices", () => {
  it("parses a month and falls back to today's", () => {
    expect(monthRange("2026-12", "2026-10-14")).toMatchObject({ first: "2026-12-01", next: "2027-01-01", prevKey: "2026-11" });
    expect(monthRange("bad", "2026-01-14")).toMatchObject({ key: "2026-01", prevKey: "2025-12" });
  });

  it("lays out a month Sunday first", () => {
    const grid = monthGrid(2026, 10); // 1 Oct 2026 is a Thursday
    expect(grid[0].slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });

  it("buckets deadlines", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(deadlineBucket("2026-10-13", "2026-10-14")).toBe("overdue");
    expect(deadlineBucket("2026-10-21", "2026-10-14")).toBe("week");
    expect(deadlineBucket("2026-10-22", "2026-10-14")).toBe("later");
  });

  it("labels statuses by direction", () => {
    expect(statusLabel("incoming", "new")).toBe("جديد");
    expect(statusLabel("outgoing", "draft")).toBe("مسودة");
  });

  it("reports per body", () => {
    const [row] = bodyReport(
      [{ body: "المجلس", ended: true, upcoming: false }, { body: "المجلس", ended: false, upcoming: true }],
      [{ body: "المجلس" }],
      [
        { body: "المجلس", status: "done", due_date: null },
        { body: "المجلس", status: "open", due_date: "2026-01-01" },
        { body: "المجلس", status: "cancelled", due_date: null },
      ],
      "2026-10-14",
    );
    expect(row).toEqual({ body: "المجلس", held: 1, upcoming: 1, resolutions: 1, tasks: 2, done: 1, overdue: 1, percent: 50 });
  });
});
