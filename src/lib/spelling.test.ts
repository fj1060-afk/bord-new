import { describe, expect, it } from "vitest";
import { distance, glossaryMatches } from "./spelling";

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
});
