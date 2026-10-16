import { describe, expect, it } from "vitest";
import { needsText } from "./requirements";
import { bodyOf, CATEGORIES, libraryTemplates, matchTemplate, suggestTitles, templates } from "./item-templates";

describe("suggestTitles", () => {
  it("completes the financial statements item", () => {
    const [first] = suggestTitles("القوائم المالية");
    expect(first).toMatchObject({ title: "التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في (…)", kind: "decision" });
    expect(first.needs).toContain("توصية لجنة المراجعة");
    expect(suggestTitles("القوائم المالية")[1].title).toContain("الأولية الموجزة للفترة المنتهية في (…)");
  });

  it("forgives slips and short input", () => {
    expect(suggestTitles("القائم المالية")[0].title).toContain("القوائم المالية");
    expect(suggestTitles("ال")).toEqual([]);
    expect(suggestTitles("الموازنة")[0].title).toBe("التصويت على اعتماد الموازنة التقديرية لعام (…)");
  });

  it("knows assembly items", () => {
    expect(suggestTitles("زيادة رأس المال")[0].title).toContain("للجمعية العامة غير العادية");
    expect(suggestTitles("أمين السر")[0].title).toBe("التصويت على تعيين (…) أميناً لسر مجلس الإدارة وتحديد مهامه ومكافأته");
  });

  it("covers resignations and committee chairs", () => {
    expect(suggestTitles("تعيين عضو بدل عضو استقال")[0].title).toContain("بدلاً من العضو المستقيل");
    expect(suggestTitles("رئيس لجنة المراجعة")[0].title).toBe("التصويت على تعيين (…) رئيساً للجنة المراجعة");
  });

  it("searches as you type", () => {
    const found = suggestTitles("تعي");
    expect(found).toHaveLength(5);
    expect(found.every((s) => s.title.includes("تعيين"))).toBe(true);
    expect(suggestTitles("تعيين أمين")[0].title).toBe("التصويت على تعيين (…) أميناً لسر مجلس الإدارة وتحديد مهامه ومكافأته");
    expect(suggestTitles("قوائم مال")[0].title).toContain("القوائم المالية");
  });

  it("covers contracts, financing and the company's own items", () => {
    expect(suggestTitles("قرض").some((s) => s.title.includes("اتفاقية تسهيلات ائتمانية"))).toBe(true);
    expect(suggestTitles("توقيع عقد")[0].title).toContain("توقيع عقد");
    const own = libraryTemplates([{ title: "التصويت على اعتماد خطة السلامة المهنية", kind: "decision", category: "بنود الشركة", needs: null }]);
    expect(suggestTitles("السلا", 5, own)[0].title).toBe("التصويت على اعتماد خطة السلامة المهنية");
    expect(templates().every((t) => (CATEGORIES as readonly string[]).includes(t.category))).toBe(true);
  });

  it("has English for every built-in item and ranks the meeting's own items first", () => {
    expect(templates().every((t) => t.en)).toBe(true);
    const blanks = (s = "") => (s.match(/\(…\)/g) ?? []).length;
    expect(templates().filter((t) => blanks(t.title) !== blanks(t.en)).map((t) => t.title)).toEqual([]);
    expect(suggestTitles("القوائم المالية", 5, [], "audit")[0].title).toContain("والتوصية للمجلس");
    expect(suggestTitles("القوائم المالية", 5, [], "board")[0].title).toBe("التصويت على اعتماد القوائم المالية للسنة المالية المنتهية في (…)");
    expect(suggestTitles("القوائم المالية")[0].en).toBe("Approving the financial statements for the financial year ended (…)");
    expect(bodyOf({ board_id: null, committee_kind: "remuneration_nomination" })).toBe("nrc");
  });

  it("recognizes the wording a typed title is based on", () => {
    expect(matchTemplate("التصويت على فتح فرع للشركة في لندن لمزاولة نشاط التجارة، وتعيين خالد مديراً له")?.title).toBe("التصويت على فتح فرع للشركة في (…) لمزاولة نشاط (…)، وتعيين (…) مديراً له");
    expect(matchTemplate("التصويت على اعتماد محضر الاجتماع السابق")?.needs).toContain("مسودة المحضر");
    expect(matchTemplate("مناقشة خطة التحول الرقمي")).toBeNull();
  });

  it("stays quiet when nothing fits", () => {
    expect(suggestTitles("زيارة ميدانية للمصنع")).toEqual([]);
  });

  it("lists each built-in item's requirements as actions", () => {
    const all = templates();
    const reqs = all.flatMap((t) => t.reqs ?? []);
    expect(reqs.filter((r) => !r.ar.trim() || !r.en.trim())).toEqual([]);
    const deadline = /فور|خلال|يوم|أيام/;
    const dues = ["immediate", "5d", "15d", "30d", "15bd", "before_ga", "60d", "180d"];
    expect(reqs.filter((r) => r.k === "after" && deadline.test(r.ar) && !dues.includes(r.due ?? "")).map((r) => r.ar)).toEqual([]);
    expect(all.filter((t) => t.needs && !t.reqs?.length).map((t) => t.title)).toEqual([]);
    expect(all.filter((t) => t.reqs?.length && t.needs !== needsText(t.reqs)).map((t) => t.title)).toEqual([]);
    expect(all.filter((t) => !t.reqs?.length).map((t) => t.en)).toEqual(["Any other business"]);
    expect(reqs.filter((r) => r.k === "check" && r.auto === "conflict").length).toBeGreaterThan(10);
  });
});
