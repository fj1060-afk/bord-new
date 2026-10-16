import { describe, expect, it } from "vitest";
import { ordinalValue, splitArticles } from "./articles";

describe("ordinalValue", () => {
  it("reads Arabic ordinals", () => {
    expect(ordinalValue("الأولى")).toBe(1);
    expect(ordinalValue("الحادية عشرة")).toBe(11);
    expect(ordinalValue("الثانية والعشرون")).toBe(22);
    expect(ordinalValue("الخامسة بعد المائة")).toBe(105);
    expect(ordinalValue("المائة")).toBe(100);
    expect(ordinalValue("الشركة")).toBeNull();
  });
});

describe("splitArticles", () => {
  it("splits numbered, bracketed and worded articles, keeping chapters and the preamble", () => {
    const text = [
      "النظام الأساس لشركة المثال",
      "الباب الأول: تأسيس الشركة",
      "المادة الأولى: التحول",
      "تحولت الشركة إلى شركة مساهمة.",
      "المادة (2) - اسم الشركة",
      "اسم الشركة شركة المثال.",
      "الباب الثاني: رأس المال",
      "مادة ٣: يحدد رأس مال الشركة بمبلغ (…) ريال سعودي مقسم إلى أسهم متساوية القيمة الاسمية مدفوعة بالكامل.",
      "المادة الحادية عشرة",
      "مجلس الإدارة.",
      "الفصل في النزاعات من اختصاص المحكمة.",
    ].join("\n");
    const a = splitArticles(text);
    expect(a.map((x) => x.number)).toEqual(["تمهيد", "1", "2", "3", "11"]);
    expect(a[1]).toMatchObject({ heading: "التحول", chapter: "الباب الأول: تأسيس الشركة", body: "تحولت الشركة إلى شركة مساهمة." });
    expect(a[2].heading).toBe("اسم الشركة");
    // A long remainder on the article line is its body, not a heading.
    expect(a[3]).toMatchObject({ heading: null, chapter: "الباب الثاني: رأس المال" });
    expect(a[3].body).toContain("رأس مال الشركة");
    // "الفصل في" is a sentence, not a chapter.
    expect(a[4].body).toBe("مجلس الإدارة.\nالفصل في النزاعات من اختصاص المحكمة.");
  });

  it("does not treat a sentence mentioning an article as a new one", () => {
    const a = splitArticles("المادة 1\nوفقاً للمادة الخامسة من هذا النظام.\n");
    expect(a).toHaveLength(1);
    expect(a[0].body).toBe("وفقاً للمادة الخامسة من هذا النظام.");
  });

  it("keeps a reference wrapped to the start of a line inside the article", () => {
    const a = splitArticles("المادة 7\nيسري ما ورد في\nالمادة (5) من هذا النظام.\nArticle 3 of this Law applies.\nالمادة 8\nنص.");
    expect(a.map((x) => x.number)).toEqual(["7", "8"]);
    expect(a[0].body).toBe("يسري ما ورد في\nالمادة (5) من هذا النظام.\nArticle 3 of this Law applies.");
  });

  it("keeps unnumbered text as one block", () => {
    expect(splitArticles("سياسة تعارض المصالح\nنص السياسة")).toEqual([{ number: "تمهيد", heading: null, chapter: null, body: "سياسة تعارض المصالح\nنص السياسة" }]);
  });
});
