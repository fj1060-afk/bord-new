import { describe, expect, it } from "vitest";
import { meetingCode, meetingReference, moveItem, riyadhParts, riyadhTimestamp, rsvpSummary, storagePath, totalMinutes } from "./meetings";

describe("meetings", () => {
  it("converts Riyadh date and time to UTC and back", () => {
    const iso = riyadhTimestamp("2026-10-20", "09:30");
    expect(iso).toBe("2026-10-20T06:30:00.000Z");
    expect(riyadhParts(iso!)).toEqual({ date: "2026-10-20", time: "09:30" });
    expect(riyadhTimestamp("2026-10-20", "9:30")).toBeNull();
    expect(riyadhTimestamp("", "09:30")).toBeNull();
  });

  it("keeps the Riyadh date for late-evening meetings", () => {
    expect(riyadhParts("2026-12-31T22:00:00.000Z")).toEqual({ date: "2027-01-01", time: "01:00" });
  });

  it("builds the meeting reference from the Riyadh year", () => {
    expect(meetingReference("BD-2026-003")).toBe("BD-2026-003");
    expect(meetingReference(null)).toBe("مسودة (يُرقَّم عند إصدار الدعوة)");
    expect(meetingCode("BD", 2026, 1, { separator: "-", digits: 3, withYear: true })).toBe("BD-2026-001");
    expect(meetingCode("AC", 2026, 12, { separator: "/", digits: 2, withYear: false })).toBe("AC/12");
  });

  it("sums agenda durations, ignoring blanks", () => {
    expect(totalMinutes([{ duration_minutes: 30 }, { duration_minutes: null }, { duration_minutes: 15 }])).toBe(45);
  });

  it("moves agenda items and renumbers them", () => {
    const items = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
      { id: "c", position: 5 },
    ];
    expect(moveItem(items, "c", "up")).toEqual([
      { id: "a", position: 1 },
      { id: "c", position: 2 },
      { id: "b", position: 3 },
    ]);
    expect(moveItem(items, "a", "up")).toEqual([]);
    expect(moveItem(items, "c", "down")).toEqual([]);
    expect(moveItem(items, "x", "down")).toEqual([]);
  });

  it("counts RSVPs", () => {
    expect(rsvpSummary([{ rsvp: "accepted" }, { rsvp: "accepted" }, { rsvp: "pending" }, { rsvp: "declined" }])).toEqual({
      accepted: 2,
      declined: 1,
      tentative: 0,
      pending: 1,
    });
  });

  it("builds safe storage paths that keep only the extension", () => {
    expect(storagePath("m1", "تقرير الربع الثالث.PDF", "r1")).toBe("m1/r1.pdf");
    expect(storagePath("m1", "noext", "r1")).toBe("m1/r1");
    expect(storagePath("m1", "../../evil.p$hp", "r1")).toBe("m1/r1.php");
  });
});
