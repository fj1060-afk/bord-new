import { describe, expect, it } from "vitest";
import { noticeDeadline, parseOwnershipNotice, totalPercent } from "./declarations";

describe("ownership notice", () => {
  const base = { name: "خالد", id: "1012345678", issuer: "شركة مجلس", eventDate: "2026-10-15", direct: { shares: "1,000,000 عادي", percent: "4.5" } };

  it("requires the essentials", () => {
    expect(parseOwnershipNotice({ ...base, id: "" })).toBeNull();
    expect(parseOwnershipNotice(base)?.type).toBe("holder");
  });

  it("cleans holdings and adds up field 5", () => {
    const n = parseOwnershipNotice({ ...base, relatives: true, interests: [{ name: "زوجة", percent: "٠.٧" }, { name: "" }, { name: "ابن", percent: "abc" }] })!;
    expect(n.interests.map((h) => h.percent)).toEqual(["0.7", ""]);
    expect(totalPercent(n)).toBe("5.2");
  });

  it("is due by the third trading day", () => {
    // Thursday 15 October 2026 → Sunday, Monday, Tuesday.
    expect(noticeDeadline("2026-10-15")).toBe("2026-10-20");
  });
});
