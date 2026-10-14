import { describe, expect, it } from "vitest";
import { defaultClosing, defaultIntro, isOverdue, resolutionReference, riyadhToday, signatureProgress } from "./minutes";

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

  it("drafts an opening paragraph with scheduled and actual time, own right and proxies", () => {
    const [ar, en] = defaultIntro({ body: "مجلس الإدارة", bodyEn: "Board of Directors", number: 3, year: "2026", date: "21 ديسمبر 2026", dateEn: "21 December 2026", scheduled: "10:00 ص", started: "10:05 ص", scheduledEn: "10:00 AM", startedEn: "10:05 AM", location: "قاعة المجلس", locationEn: null, own: 4, proxies: 1, members: 5, quorumMet: true });
    expect(ar).toContain("موعده المقرر الساعة 10:00 ص وبدأ فعلياً الساعة 10:05 ص");
    expect(ar).toContain("4 من الأعضاء أصالةً و1 بالإنابة من أصل 5");
    expect(en).toContain("4 members attending in their own right and 1 by proxy out of 5");
  });

  it("closes without claiming deferred items were discussed", () => {
    expect(defaultClosing("12:20 م", "12:20 PM", [])[0]).toContain("استكمال مناقشة");
    const [ar, en] = defaultClosing("12:20 م", "12:20 PM", [2]);
    expect(ar).toContain("عدا البند (2) الذي أُجّل");
    expect(en).toContain("item 2 was deferred");
  });

  it("tracks who still has to sign", () => {
    const p = signatureProgress([{ person_id: "a" }, { person_id: "b" }], [{ person_id: "b" }]);
    expect(p).toEqual({ total: 2, signed: 1, remaining: [{ person_id: "a" }] });
  });
});
