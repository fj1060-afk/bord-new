import { describe, expect, it } from "vitest";
import { attendanceRates, greeting, implementation } from "./dashboard";

describe("dashboard", () => {
  it("computes attendance rates, lowest first", () => {
    const rates = attendanceRates([
      { person_id: "a", name: "أحمد", status: "present" },
      { person_id: "a", name: "أحمد", status: "absent" },
      { person_id: "b", name: "بدر", status: "proxy" },
      { person_id: "b", name: "بدر", status: "remote" },
      { person_id: "c", name: "خالد", status: null },
    ]);
    expect(rates.map((r) => [r.name, r.attended, r.invited, r.rate])).toEqual([
      ["خالد", 0, 1, 0],
      ["أحمد", 1, 2, 50],
      ["بدر", 2, 2, 100],
    ]);
  });

  it("measures implementation and ignores cancelled tasks", () => {
    const result = implementation(
      [
        { status: "done", due_date: "2026-01-01" },
        { status: "open", due_date: "2026-10-01" },
        { status: "in_progress", due_date: null },
        { status: "cancelled", due_date: "2026-01-01" },
      ],
      "2026-10-14",
    );
    expect(result).toEqual({ total: 3, done: 1, overdue: 1, percent: 33 });
    expect(implementation([], "2026-10-14").percent).toBeNull();
  });

  it("greets by Riyadh time", () => {
    expect(greeting(new Date("2026-10-14T05:00:00Z"))).toBe("صباح الخير");
    expect(greeting(new Date("2026-10-14T12:00:00Z"))).toBe("مساء الخير");
  });
});
