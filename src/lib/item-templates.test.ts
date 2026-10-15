import { describe, expect, it } from "vitest";
import { suggestTitles } from "./item-templates";

const oct2026 = new Date("2026-10-15T12:00:00+03:00");

describe("suggestTitles", () => {
  it("completes the financial statements item", () => {
    const [first] = suggestTitles("القوائم المالية", oct2026);
    expect(first).toEqual({ title: "التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2025", kind: "decision" });
    expect(suggestTitles("القوائم المالية", oct2026)[1].title).toContain("30 سبتمبر 2026");
  });

  it("forgives slips and short input", () => {
    expect(suggestTitles("القائم المالية", oct2026)[0].title).toContain("القوائم المالية");
    expect(suggestTitles("ال", oct2026)).toEqual([]);
    expect(suggestTitles("الموازنة", oct2026)[0].title).toBe("التصويت على اعتماد الموازنة التقديرية لعام 2027");
  });

  it("stays quiet when nothing fits", () => {
    expect(suggestTitles("زيارة ميدانية للمصنع", oct2026)).toEqual([]);
  });
});
