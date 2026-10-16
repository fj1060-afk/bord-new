import { describe, expect, it } from "vitest";
import { asRecommendation, checkAgainstPowers, committeeRules, compositionChecks } from "./committee-powers";

const audit = committeeRules("audit")!;

describe("committee powers", () => {
  it("knows the four statutory committees and not the others", () => {
    expect(audit.minMeetings).toEqual({ perYear: 4, ref: "م54/أ" });
    expect(committeeRules("remuneration_nomination")?.powers.length).toBe(14);
    expect(committeeRules("executive")).toBeNull();
  });

  it("sees an audit item deciding what the committee only recommends", () => {
    const c = checkAgainstPowers("التصويت على اعتماد القوائم المالية الأولية للربع الثاني", audit.powers);
    expect(c.power?.ref).toBe("م52/أ/1");
    expect(c.deciding).toBe(true);
    expect(checkAgainstPowers("مراجعة القوائم المالية والتوصية للمجلس باعتمادها", audit.powers).deciding).toBe(false);
    expect(checkAgainstPowers("اعتماد خطة المراجعة الداخلية لعام 2027", audit.powers).power?.kind).toBe("decide");
  });

  it("rewords a decision as a recommendation", () => {
    expect(asRecommendation("التصويت على اعتماد القوائم المالية")).toBe("التوصية لمجلس الإدارة باعتماد القوائم المالية");
    expect(asRecommendation("تعيين مراجع الحسابات")).toBe("التوصية لمجلس الإدارة بتعيين مراجع الحسابات");
  });
});

it("checks an audit committee's composition", () => {
  const checks = compositionChecks("audit", [
    { name: "أ", position: "chair", boardCategory: "non_executive" },
    { name: "ب", position: "member", boardCategory: "executive" },
  ]);
  expect(checks.filter((c) => !c.ok).map((c) => c.ref)).toEqual(["م47/4", "م51/أ", "م51/ب", "م51/ج", "م51/د"]);
});
