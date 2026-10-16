import { describe, expect, it } from "vitest";
import { bodyMismatch } from "./item-body";
import { matchTemplate, suggestTitles } from "./item-templates";

describe("items stay with their body", () => {
  it("suggests only the meeting's own and general wordings", () => {
    const audit = suggestTitles("القوائم المالية", 10, [], "audit").map((s) => s.title);
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.every((t) => !t.startsWith("التصويت على اعتماد القوائم"))).toBe(true);
    const board = suggestTitles("القوائم المالية", 10, [], "board").map((s) => s.title);
    expect(board.some((t) => t.startsWith("مراجعة القوائم المالية"))).toBe(false);
  });

  it("refuses the board's wording in an audit committee and offers the committee's", () => {
    const m = bodyMismatch("التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2025", [], "audit")!;
    expect(m.block).toBe(true);
    expect(m.text).toContain("من بنود مجلس الإدارة");
    expect(m.fixes?.[0]).toContain("مراجعة القوائم المالية السنوية");
  });

  it("leaves general and own items alone", () => {
    expect(bodyMismatch("التصويت على اعتماد محضر الاجتماع السابق", [], "audit")).toBeNull();
    expect(bodyMismatch("مراجعة سجل المخاطر ومؤشراتها للفترة المنتهية في 30 يونيو 2026", [], "risk")).toBeNull();
    expect(matchTemplate("مراجعة سجل المخاطر ومؤشراتها للفترة المنتهية في 30 يونيو 2026", [], "board")).toBeNull();
  });

  it("keeps a committee item out of the board", () => {
    expect(bodyMismatch("الاجتماع مع مراجع الحسابات الخارجي دون حضور الإدارة التنفيذية", [], "board")?.block).toBe(true);
  });
});
