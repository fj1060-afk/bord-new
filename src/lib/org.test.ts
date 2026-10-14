import { describe, expect, it } from "vitest";
import { BOARD_POSITIONS, currentYear, isOneOf, membershipError, sortByPosition } from "./org";

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

  it("explains membership constraint errors", () => {
    expect(membershipError("23505", 'violates unique constraint "board_members_one_chair"')).toContain("المنصب");
    expect(membershipError("23505", 'violates "committee_members_one_active"')).toContain("عضو نشط");
    expect(membershipError("23514", "check")).toContain("التواريخ");
    expect(membershipError(undefined, undefined)).toContain("تعذّر");
  });
});
