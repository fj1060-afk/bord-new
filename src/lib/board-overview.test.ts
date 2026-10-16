import { describe, expect, it } from "vitest";
import { addBusinessDays, blackouts, cmaNotices } from "./board-overview";

describe("addBusinessDays", () => {
  it("skips Friday and Saturday", () => {
    // 2026-10-15 is a Thursday.
    expect(addBusinessDays("2026-10-15", 1)).toBe("2026-10-18");
    expect(addBusinessDays("2026-10-15", 5)).toBe("2026-10-22");
  });
});

it("lists recent appointments with their CMA deadline", () => {
  const n = cmaNotices([{ name: "أ", start_date: "2026-10-15" }, { name: "ب", start_date: "2026-01-01" }], "2026-10-25");
  expect(n).toEqual([{ name: "أ", start_date: "2026-10-15", due: "2026-10-22", overdue: true }]);
});

describe("blackouts", () => {
  it("finds the next window for a December year end", () => {
    const b = blackouts(12, "2026-10-16");
    expect(b.now).toBeNull();
    expect(b.next).toMatchObject({ end: "2026-12-31", annual: true, start: "2026-12-01" });
    expect(b.pending?.end).toBe("2026-09-30");
  });

  it("is in force in the 15 days before a quarter end", () => {
    expect(blackouts(12, "2026-09-20").now).toMatchObject({ end: "2026-09-30", annual: false, start: "2026-09-15" });
  });

  it("follows a June year end", () => {
    const b = blackouts(6, "2026-05-10");
    expect(b.next).toMatchObject({ end: "2026-06-30", annual: true, start: "2026-05-31" });
  });
});
