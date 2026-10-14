import { describe, expect, it } from "vitest";
import { defaultIntro, isOverdue, resolutionReference, riyadhToday, signatureProgress } from "./minutes";

describe("minutes", () => {
  it("formats resolution references", () => {
    expect(resolutionReference(3, 2026)).toBe("3/2026");
    expect(resolutionReference(null, null)).toBe("—/—");
  });

  it("flags only unfinished tasks past their due date", () => {
    expect(isOverdue("2026-10-01", "open", "2026-10-14")).toBe(true);
    expect(isOverdue("2026-10-01", "in_progress", "2026-10-14")).toBe(true);
    expect(isOverdue("2026-10-01", "done", "2026-10-14")).toBe(false);
    expect(isOverdue("2026-10-14", "open", "2026-10-14")).toBe(false);
    expect(isOverdue(null, "open", "2026-10-14")).toBe(false);
  });

  it("uses the Riyadh date for today", () => {
    expect(riyadhToday(new Date("2026-10-14T22:00:00Z"))).toBe("2026-10-15");
  });

  it("drafts an opening paragraph", () => {
    const text = defaultIntro({ body: "مجلس الإدارة", reference: "رقم 3 لعام 2026", date: "الاثنين 21 ديسمبر 2026", time: "10:00 ص", location: "قاعة المجلس", attendees: 5, members: 7 });
    expect(text).toContain("مجلس الإدارة");
    expect(text).toContain("في قاعة المجلس");
    expect(text).toContain("5 من أصل 7");
  });

  it("tracks who still has to sign", () => {
    const p = signatureProgress([{ person_id: "a" }, { person_id: "b" }], [{ person_id: "b" }]);
    expect(p).toEqual({ total: 2, signed: 1, remaining: [{ person_id: "a" }] });
  });
});
