import { describe, expect, it } from "vitest";
import { fold, reviewItem } from "./item-review";

describe("reviewItem", () => {
  it("flags a member whose disclosure matches the item", () => {
    const f = reviewItem({ title: "ترسية عقد الصيانة على شركة النخبة", kind: "decision" }, { disclosures: [{ name: "خالد", details: "أملك حصة في شركة النخبة للمقاولات" }, { name: "سارة", details: null }] });
    expect(f.some((x) => x.text.includes("خالد") && x.text.includes("النخبة"))).toBe(true);
    expect(f.some((x) => x.text.includes("سارة"))).toBe(false);
    expect(f.some((x) => x.ref?.startsWith("نظام الشركات م27") && x.text.startsWith("إن كان"))).toBe(true);
  });

  it("does not match generic words", () => {
    expect(reviewItem({ title: "خطة الشركة", kind: "discussion" }, { disclosures: [{ name: "خالد", details: "عضو مجلس إدارة شركة" }] })).toEqual([]);
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

  it("suggests complete titles", () => {
    const [cut] = reviewItem({ title: "القائم المالية لعام", kind: "decision", description: "x" }, { disclosures: [], year: 2025 });
    expect(cut.fixes).toEqual(["التصويت على اعتماد القوائم المالية لعام 2025", "التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في 31 ديسمبر 2025"]);
    const [period] = reviewItem({ title: "اعتماد الميزانية", kind: "decision", description: "x" }, { disclosures: [], year: 2025 });
    expect(period.fixes?.[1]).toBe("اعتماد الميزانية لعام 2025");
    expect(reviewItem({ title: "الميزانية 2025", kind: "decision", description: "x" }, { disclosures: [], year: 2025 })[0].fixes).toEqual(["التصويت على اعتماد الميزانية 2025", "التصويت على الميزانية 2025"]);
  });
});

describe("reviewItem rules", () => {
  it("skips assembly-reserved warnings once worded as a recommendation", () => {
    expect(reviewItem({ title: "زيادة رأس المال", kind: "discussion" }).some((f) => f.ref === "نظام الشركات م85")).toBe(true);
    expect(reviewItem({ title: "التوصية للجمعية العامة غير العادية بزيادة رأس المال", kind: "discussion" }).some((f) => f.ref === "نظام الشركات م85")).toBe(false);
  });

  it("adds CMA rules only for listed companies", () => {
    const item = { title: "اعتماد القوائم المالية لعام 2025", kind: "discussion" };
    expect(reviewItem(item, { listed: true }).length).toBe(reviewItem(item).length + 1);
  });
});

describe("policy items", () => {
  it("lists policy requirements and sends assembly policies to the assembly", () => {
    expect(reviewItem({ title: "التصويت على اعتماد سياسة الإفصاح", kind: "decision", description: "x" }).some((f) => f.text.startsWith("اعتماد السياسات"))).toBe(true);
    expect(reviewItem({ title: "التصويت على اعتماد سياسة المكافآت", kind: "decision", description: "x" }).some((f) => f.level === "warn" && f.ref?.includes("م58"))).toBe(true);
    expect(reviewItem({ title: "التوصية للجمعية العامة باعتماد سياسة المكافآت", kind: "decision", description: "x" }).some((f) => f.level === "warn")).toBe(false);
  });
});

describe("board remuneration wording variants", () => {
  it("sends board remuneration to the assembly however it is phrased", () => {
    for (const title of ["التصويت على صرف مكافأة لأعضاء مجلس الإدارة", "اعتماد مكافآت أعضاء مجلس الإدارة"]) {
      expect(reviewItem({ title, kind: "decision", description: "x" }).some((f) => f.ref === "نظام الشركات م87")).toBe(true);
    }
  });
});

describe("template gaps", () => {
  it("asks to choose between alternatives and offers each", () => {
    const [gap] = reviewItem({ title: "التوصية للجمعية العامة غير العادية بزيادة/تخفيض رأس مال الشركة", kind: "decision", description: "x" });
    expect(gap.fixes).toEqual(["التوصية للجمعية العامة غير العادية بزيادة رأس مال الشركة", "التوصية للجمعية العامة غير العادية بتخفيض رأس مال الشركة"]);
    expect(reviewItem({ title: "التصويت على تعيين (…) مستشاراً (قانونياً/مالياً) للشركة", kind: "decision", description: "x" })[0].fixes?.[1]).toBe("التصويت على تعيين (…) مستشاراً مالياً للشركة");
  });

  it("flags unfilled blanks", () => {
    expect(reviewItem({ title: "التصويت على تعيين (…) رئيساً للجنة المراجعة", kind: "decision", description: "x" }).some((f) => f.text.includes("فراغات"))).toBe(true);
  });
});

describe("auto-filled documents line", () => {
  it("does not trigger rules", () => {
    const f = reviewItem({ title: "التوصية للجمعية العامة غير العادية بزيادة رأس مال الشركة", kind: "decision", description: "المستندات الداعمة: بيان المجلس؛ تقرير مراجع الحسابات" });
    expect(f.some((x) => x.ref?.includes("م52"))).toBe(false);
  });
});

describe("dividend dates", () => {
  it("asks for the eligibility and distribution dates", () => {
    const dates = (title: string) => reviewItem({ title, kind: "decision", description: "x" }).some((f) => f.ref?.startsWith("نظام الشركات م125/2"));
    expect(dates("التوصية للجمعية العامة العادية بتوزيع أرباح نقدية بواقع 2 ريال للسهم")).toBe(true);
    expect(dates("التوصية للجمعية العامة العادية بتوزيع أرباح نقدية بواقع 2 ريال للسهم، على أن تكون الأحقية للمساهمين المسجلين بنهاية يوم 1 مايو")).toBe(false);
    expect(dates("التصويت على اعتماد سياسة توزيع الأرباح")).toBe(false);
  });
});

describe("operative elements the law requires in the resolution", () => {
  const refs = (title: string, listed = false) => reviewItem({ title, kind: "decision", description: "x" }, { listed }).map((f) => f.ref ?? "");

  it("asks for the auditor's fees and scope", () => {
    expect(refs("التوصية للجمعية العامة العادية بتعيين مراجع الحسابات للعام 2026")).toContain("نظام الشركات م18؛ اللائحة التنفيذية للشركات المدرجة م3");
    expect(refs("التوصية للجمعية العامة العادية بتعيين مراجع الحسابات لمراجعة القوائم المالية للعام 2026 وتحديد أتعابه")).not.toContain("نظام الشركات م18؛ اللائحة التنفيذية للشركات المدرجة م3");
  });

  it("asks for the capital before and after a change", () => {
    const ref = "نظام الشركات م126 وم133 وم135";
    expect(refs("التوصية للجمعية العامة غير العادية بزيادة رأس المال")).toContain(ref);
    expect(refs("التوصية للجمعية العامة غير العادية بزيادة رأس مال الشركة من 100,000,000 ريال إلى 150,000,000 ريال عن طريق منح أسهم")).not.toContain(ref);
    expect(refs("التصويت على زيادة رأس مال الشركة التابعة")).not.toContain(ref);
  });

  it("asks a listed company's buy-back for its purpose, size, funding and period", () => {
    const ref = "اللائحة التنفيذية للشركات المدرجة م17 وم24";
    expect(refs("التوصية للجمعية العامة غير العادية بشراء الشركة لعدد 1,000,000 من أسهمها", true)).toContain(ref);
    expect(refs("التوصية للجمعية العامة غير العادية بشراء الشركة لعدد 1,000,000 من أسهمها", false)).not.toContain(ref);
    expect(refs("التوصية للجمعية العامة غير العادية بشراء الشركة لعدد أقصاه 1,000,000 من أسهمها بغرض الاحتفاظ بها أسهم خزينة", true)).not.toContain(ref);
    expect(refs("التوصية للجمعية العامة غير العادية بشراء الشركة لعدد 1,000,000 من أسهمها", true).some((r) => r.startsWith("نظام الشركات م27"))).toBe(false);
  });

  it("asks for the board term on election", () => {
    const ref = "نظام الشركات م68؛ اللائحة التنفيذية للشركات المدرجة م5";
    expect(refs("التوصية للجمعية العامة العادية بانتخاب أعضاء مجلس الإدارة للدورة القادمة")).toContain(ref);
    expect(refs("التوصية للجمعية العامة العادية بانتخاب أعضاء مجلس الإدارة للدورة القادمة التي تبدأ في 1 يناير 2027")).not.toContain(ref);
  });

  it("leaves a subsidiary's liquidation, a dividend policy and an approved dividend alone", () => {
    expect(refs("التصويت على تصفية الشركة التابعة شركة النخبة")).not.toContain("نظام الشركات م85");
    expect(reviewItem({ title: "التصويت على اعتماد سياسة توزيع الأرباح", kind: "decision", description: "x" }).some((f) => f.text.startsWith("حدّد الفترة"))).toBe(false);
    expect(refs("التصويت على اتخاذ إجراءات صرف الأرباح التي أقرتها الجمعية العامة بتاريخ 1 مايو 2026 وفق تاريخي الأحقية والتوزيع المحددين في قرارها")).toEqual([]);
  });
});

describe("delegations", () => {
  it("asks for the delegate, capacity, act and duration", () => {
    const warn = (title: string) => reviewItem({ title, kind: "decision", description: "x" }).some((f) => f.ref === "نظام الشركات م77/1 وم79");
    expect(warn("التصويت على تفويض أحمد بتوقيع العقد نيابة عن الشركة")).toBe(true);
    expect(warn("التصويت على تفويض أحمد بصفته المدير المالي بالتوقيع نيابة عن الشركة على عقد التوريد أمام شركة النخبة لمدة سنة")).toBe(false);
    expect(warn("التوصية للجمعية العامة العادية بتفويض مجلس الإدارة بتوزيع أرباح مرحلية")).toBe(false);
  });
});
