import { describe, expect, it } from "vitest";
import { fold, reviewItem } from "./item-review";

describe("reviewItem", () => {
  it("flags a member whose disclosure matches the item", () => {
    const f = reviewItem({ title: "ترسية عقد الصيانة على شركة النخبة", kind: "decision" }, [{ name: "خالد", details: "أملك حصة في شركة النخبة للمقاولات" }, { name: "سارة", details: null }]);
    expect(f.some((x) => x.text.includes("خالد") && x.text.includes("النخبة"))).toBe(true);
    expect(f.some((x) => x.text.includes("سارة"))).toBe(false);
    expect(f.some((x) => x.ref === "نظام الشركات م71" && x.text.startsWith("إن كان"))).toBe(true);
  });

  it("does not match generic words", () => {
    expect(reviewItem({ title: "خطة الشركة", kind: "discussion" }, [{ name: "خالد", details: "عضو مجلس إدارة شركة" }])).toEqual([]);
  });

  it("marks general assembly matters and financial statements", () => {
    expect(reviewItem({ title: "زيادة رأس المال", kind: "decision", description: "x" })[0].text).toContain("الجمعية العامة");
    expect(reviewItem({ title: "اعتماد القوائم المالية لعام 2025", kind: "decision", description: "x" })).toHaveLength(1);
  });

  it("asks for decision wording and a description", () => {
    expect(reviewItem({ title: "الميزانية 2025", kind: "decision" })).toHaveLength(2);
    expect(reviewItem({ title: "الميزانية 2025", kind: "discussion" })).toEqual([]);
  });

  it("folds Arabic spelling variants", () => {
    expect(fold("الشَّركة إدارة")).toBe("الشركه اداره");
  });

  it("asks for the period and flags cut-short titles", () => {
    expect(reviewItem({ title: "القائم المالية لعام", kind: "discussion" }).map((f) => f.text)[0]).toContain("ناقص");
    expect(reviewItem({ title: "اعتماد القوائم المالية", kind: "decision", description: "x" }).some((f) => f.text.startsWith("حدّد الفترة"))).toBe(true);
    expect(reviewItem({ title: "الميزانية للربع الثالث", kind: "discussion" })).toEqual([]);
  });
});
