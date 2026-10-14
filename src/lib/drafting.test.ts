import { describe, expect, it } from "vitest";
import { draftingHints } from "./drafting";

describe("draftingHints", () => {
  it("passes a well-formed resolution", () => {
    expect(draftingHints("قرر المجلس الموافقة على شراء الأرض بمبلغ (500,000) خمسمائة ألف ريال، وتفويض الرئيس التنفيذي بإتمام الشراء خلال ثلاثة أشهر.")).toEqual([]);
  });

  it("flags vague, ownerless, undated text and bare amounts", () => {
    const hints = draftingHints("شراء الارض للشركه بمبلغ مناسب 500000 ريال ويتم التنفيذ بأسرع وقت");
    expect(hints).toHaveLength(5);
    expect(hints.join(" ")).toContain("بأسرع وقت");
  });

  it("ignores empty text", () => {
    expect(draftingHints("")).toEqual([]);
  });
});
