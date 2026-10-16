import { describe, expect, it } from "vitest";
import { AUTHORITY, isAuthorization } from "./authority";
import { templates } from "./item-templates";

const blanks = (s = "") => (s.match(/\(…\)/g) ?? []).length;
const choices = (s = "") => (s.match(/\//g) ?? []).length;
const all = templates();

describe("who decides each library item", () => {
  it("gives every item a known authority", () => {
    expect(all.filter((t) => !(t.authority in AUTHORITY)).map((t) => t.title)).toEqual([]);
  });

  it("names the deciding setting and the assembly wording for items the board may not decide alone", () => {
    const conditional = all.filter((t) => t.authority === "bylaws" || t.authority === "board_authorized");
    expect(conditional.length).toBeGreaterThan(5);
    for (const t of conditional) {
      expect(t.power, t.title).toBeDefined();
      // An assembly authorization drives "board_authorized"; a restrictable power drives "bylaws".
      expect(isAuthorization(t.power!), t.title).toBe(t.authority === "board_authorized");
      expect(t.alt, t.title).toBeDefined();
      expect(t.alt!.title.startsWith("التوصية للجمعية العامة العادية"), t.title).toBe(true);
      expect(t.alt!.en.startsWith("Recommending to the Ordinary General Assembly"), t.title).toBe(true);
      expect([blanks(t.alt!.title), blanks(t.alt!.en)], t.title).toEqual([blanks(t.title), blanks(t.en)]);
      expect([choices(t.alt!.title), choices(t.alt!.en)], t.title).toEqual([choices(t.title), choices(t.en)]);
      // A "/" choice stays a swap of single words.
      expect(t.alt!.title.match(/\S+\/\S+/g) ?? [], t.title).toHaveLength(choices(t.title));
    }
    expect(all.filter((t) => t.authority !== "bylaws" && t.authority !== "board_authorized" && (t.power || t.alt)).map((t) => t.title)).toEqual([]);
  });

  it("words assembly items as the board's recommendation", () => {
    const ga = all.filter((t) => t.authority === "ga_ordinary" || t.authority === "ga_extraordinary");
    expect(ga.filter((t) => !t.title.startsWith("التوصية للجمعية العامة")).map((t) => t.title)).toEqual([]);
    expect(ga.filter((t) => t.title.includes("غير العادية") !== (t.authority === "ga_extraordinary")).map((t) => t.title)).toEqual([]);
    // And a recommendation to the assembly is never filed as the board's own decision.
    expect(all.filter((t) => t.title.startsWith("التوصية للجمعية العامة") && !t.authority.startsWith("ga_")).map((t) => t.title)).toEqual([]);
  });

  it("files committee meetings' items as committee decisions", () => {
    const committee = (b: string) => b === "audit" || b === "nrc" || b === "risk";
    expect(all.filter((t) => committee(t.body) !== (t.authority === "committee")).map((t) => t.title)).toEqual([]);
  });

  it("cites the legal basis in the short Arabic form", () => {
    const ref = /^(نظام الشركات|لائحة الحوكمة|اللائحة التنفيذية للمدرجة) م\d+(\/\d+)?(\/م\d+)*$/;
    expect(all.filter((t) => t.authorityRef && !ref.test(t.authorityRef)).map((t) => t.authorityRef)).toEqual([]);
  });

  it("classifies the key items", () => {
    const by = (start: string) => all.find((t) => t.title.startsWith(start))!;
    expect(by("التصويت على اعتماد القوائم المالية للسنة").authority).toBe("board_then_ga");
    expect(by("التصويت على توزيع أرباح مرحلية")).toMatchObject({ authority: "board_authorized", power: "interim_dividends" });
    expect(by("التصويت على رهن")).toMatchObject({ authority: "bylaws", power: "pledges", authorityRef: "نظام الشركات م74" });
    expect(by("التصويت على تعيين (…) عضواً في مجلس الإدارة").authority).toBe("board_then_ga");
    expect(by("التوصية للجمعية العامة غير العادية بتعديل").authority).toBe("ga_extraordinary");
  });
});
