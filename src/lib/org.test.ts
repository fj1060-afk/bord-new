import { describe, expect, it } from "vitest";
import { BOARD_POSITIONS, currentYear, isOneOf, membershipError, sortByPosition, termEnd, termYears } from "./org";

describe("org", () => {
  it("sorts chair, vice chair, secretary, then members by name", () => {
    const rows = [
      { position: "member", name: "سعد" },
      { position: "secretary", name: "منى" },
      { position: "member", name: "أحمد" },
      { position: "chair", name: "خالد" },
      { position: "vice_chair", name: "ريم" },
    ];
    expect(sortByPosition(rows).map((r) => r.name)).toEqual(["خالد", "ريم", "منى", "أحمد", "سعد"]);
  });

  it("validates option keys", () => {
    expect(isOneOf("chair", BOARD_POSITIONS)).toBe(true);
    expect(isOneOf("toString", BOARD_POSITIONS)).toBe(false);
    expect(isOneOf(undefined, BOARD_POSITIONS)).toBe(false);
  });

  it("uses the Saudi calendar year", () => {
    expect(currentYear(new Date("2026-12-31T22:00:00Z"))).toBe(2027);
    expect(currentYear(new Date("2026-06-01T00:00:00Z"))).toBe(2026);
  });

  it("computes the last day of a board term", () => {
    expect(termEnd("2026-01-01", 3)).toBe("2028-12-31");
    expect(termEnd("2026-07-15", 4)).toBe("2030-07-14");
    expect(termEnd("2024-03-01", 1)).toBe("2025-02-28");
    expect(termEnd("bad", 3)).toBeNull();
    expect(termEnd("2026-01-01", 0)).toBeNull();
    expect(termYears("2026-01-01", "2028-12-31")).toBe(3);
  });

  it("explains membership constraint errors", () => {
    expect(membershipError("23505", 'violates unique constraint "board_members_one_chair"')).toContain("المنصب");
    expect(membershipError("23505", 'violates "committee_members_one_active"')).toContain("عضو نشط");
    expect(membershipError("23514", "check")).toContain("التواريخ");
    expect(membershipError(undefined, undefined)).toContain("تعذّر");
  });
});
