import { describe, expect, it } from "vitest";
import { dateProblems, datesIn, periodEnd, periodNotEnded, yearsAhead } from "./item-period";

describe("periodEnd", () => {
  it("reads a period end date or a fiscal year", () => {
    expect(periodEnd("التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2028")).toBe("2028-12-31");
    expect(periodEnd("اعتماد القوائم المالية الأولية المنتهية في 30 يونيو 2026")).toBe("2026-06-30");
    expect(periodEnd("التوصية للجمعية بتوزيع أرباح نقدية عن العام المالي (2028)")).toBe("2028-12-31");
  });
  it("ignores forward-looking items", () => {
    expect(periodEnd("اعتماد الموازنة التقديرية للعام 2027")).toBeNull();
    expect(periodEnd("التصويت على اعتماد الخطة الاستراتيجية للأعوام 2027")).toBeNull();
  });
  it("flags a period still running on the meeting day", () => {
    expect(periodNotEnded("اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2028", "2026-10-18")).toBe(true);
    expect(periodNotEnded("اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2025", "2026-03-10")).toBe(false);
  });
});

describe("dateProblems", () => {
  const item = "التوصية للجمعية العامة العادية بتوزيع أرباح نقدية على المساهمين عن العام المالي (2028) بواقع (1.8) ريال للسهم، على أن تكون الأحقية للمساهمين المسجلين بنهاية يوم (الأحد) ويبدأ التوزيع في 20/10/2026";
  it("flags a distribution before the period ends", () => {
    expect(datesIn(item)).toEqual(["2026-10-20"]);
    expect(dateProblems(item, "2026-10-18")).toEqual(["20/10/2026 قبل نهاية الفترة في 31/12/2028"]);
  });
  it("flags a date before the meeting and ignores the period end", () => {
    expect(dateProblems("اعتماد صرف المكافآت بتاريخ 1 مايو 2026", "2026-10-18")).toEqual(["01/05/2026 قبل موعد الاجتماع"]);
    expect(datesIn("اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2025")).toEqual([]);
  });
  it("finds years ahead of the meeting in its title", () => {
    expect(yearsAhead("اجتماع مجلس الإدارة الأول للسنة المالية 2028", "2026-10-18")).toEqual([2028]);
    expect(yearsAhead("اجتماع مجلس الإدارة الأول لعام 2026", "2026-10-18")).toEqual([]);
  });
});
