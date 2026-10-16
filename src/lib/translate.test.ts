import { describe, expect, it } from "vitest";
import { blankValues, fillBlanks, hasArabic } from "./translate";

describe("standard wording blanks", () => {
  it("reads the values typed into blanks", () => {
    expect(blankValues("التصويت على فتح فرع للشركة في (…)", "التصويت على فتح فرع للشركة في لندن")).toEqual(["لندن"]);
    expect(blankValues("التصويت على استثمار مبلغ (…) ريال في (…)", "التصويت على استثمار مبلغ 5,000,000 ريال في صكوك حكومية")).toEqual(["5,000,000", "صكوك حكومية"]);
    expect(blankValues("التصويت على فتح فرع للشركة في (…)", "التصويت على إغلاق فرع لندن")).toBeNull();
  });

  it("fills the English wording and leaves unfilled blanks", () => {
    expect(fillBlanks("Investing SAR (…) in (…)", ["5,000,000", "government sukuk"])).toBe("Investing SAR 5,000,000 in government sukuk");
    expect(fillBlanks("Opening a company branch in (…)", ["(…)"])).toBe("Opening a company branch in (…)");
    expect(fillBlanks("Opening a branch in (…)", ["a", "b"])).toBeNull();
    expect(hasArabic("2027")).toBe(false);
  });
});
