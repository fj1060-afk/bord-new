import { describe, expect, it } from "vitest";
import { distance, glossaryMatches, hamzaSlips, phraseSlips, withPhraseFixes } from "./spelling";

describe("spelling", () => {
  it("measures edit distance", () => {
    expect(distance("abc", "abd")).toBe(1);
    expect(distance("", "ab")).toBe(2);
  });

  it("ranks governance terms for common slips", () => {
    expect(glossaryMatches("القايم")[0]).toBe("القوائم");
    expect(glossaryMatches("الماليه")).toContain("المالية");
    expect(glossaryMatches("القوائم")).toEqual([]);
  });

  it("catches real words in the wrong governance phrase", () => {
    expect(phraseSlips("القائم المالية لعام")).toEqual([{ offset: 0, length: 6, word: "القائم", suggestions: ["القوائم"] }]);
    expect(phraseSlips("اعتماد القوائم المالية ومجلس الادارة وبالقوائم المالية")).toEqual([]);
    expect(withPhraseFixes("اعتماد القايم المالية")).toBe("اعتماد القوائم المالية");
  });
});

describe("hamzaSlips", () => {
  it("fixes hamza and taa marbuta in common words", () => {
    const r = hamzaSlips("اجتماع مجلس الادارة الاول للسنه المالية 2028");
    expect(r.fixed).toBe("اجتماع مجلس الإدارة الأول للسنة المالية 2028");
    expect(r.words.map((w) => w.from)).toEqual(["الادارة", "الاول", "للسنه"]);
    expect(hamzaSlips("اجتماع مجلس الإدارة الأول").words).toEqual([]);
  });
});
