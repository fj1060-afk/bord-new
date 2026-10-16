import { describe, expect, it } from "vitest";
import { periodEnd, periodNotEnded } from "./item-period";

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
