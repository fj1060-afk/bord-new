import { describe, expect, it } from "vitest";
import { suggestTitles } from "./item-templates";

const oct2026 = new Date("2026-10-15T12:00:00+03:00");

describe("suggestTitles", () => {
  it("completes the financial statements item", () => {
    const [first] = suggestTitles("القوائم المالية", oct2026);
    expect(first).toMatchObject({ title: "التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2025", kind: "decision" });
    expect(first.needs).toContain("توصية لجنة المراجعة");
    expect(suggestTitles("القوائم المالية", oct2026)[1].title).toContain("30 سبتمبر 2026");
  });

  it("forgives slips and short input", () => {
    expect(suggestTitles("القائم المالية", oct2026)[0].title).toContain("القوائم المالية");
    expect(suggestTitles("ال", oct2026)).toEqual([]);
    expect(suggestTitles("الموازنة", oct2026)[0].title).toBe("التصويت على اعتماد الموازنة التقديرية لعام 2027");
  });

  it("knows assembly items", () => {
    expect(suggestTitles("زيادة رأس المال", oct2026)[0].title).toContain("للجمعية العامة غير العادية");
    expect(suggestTitles("أمين السر", oct2026)[0].title).toBe("التصويت على تعيين أمين سر مجلس الإدارة وتحديد مكافأته");
  });

  it("covers resignations and committee chairs", () => {
    expect(suggestTitles("تعيين عضو بدل عضو استقال", oct2026)[0].title).toContain("بدلاً من العضو المستقيل");
    expect(suggestTitles("رئيس لجنة المراجعة", oct2026)[0].title).toBe("التصويت على تعيين (…) رئيساً للجنة المراجعة");
  });

  it("searches as you type", () => {
    const found = suggestTitles("تعي", oct2026);
    expect(found).toHaveLength(5);
    expect(found.every((s) => s.title.includes("تعيين"))).toBe(true);
    expect(suggestTitles("تعيين أمين", oct2026)[0].title).toBe("التصويت على تعيين أمين سر مجلس الإدارة وتحديد مكافأته");
    expect(suggestTitles("قوائم مال", oct2026)[0].title).toContain("القوائم المالية");
  });

  it("stays quiet when nothing fits", () => {
    expect(suggestTitles("زيارة ميدانية للمصنع", oct2026)).toEqual([]);
  });
});
