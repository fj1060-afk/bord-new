import { describe, expect, it } from "vitest";
import { groupPeople } from "./people-groups";

describe("groupPeople", () => {
  it("puts the chair first and each person under where they sit", () => {
    const groups = groupPeople([
      { id: "1", full_name: "طلال محمد", board: { position: "member", category: "independent" }, committees: [{ name: "لجنة المراجعة", position: "chair" }] },
      { id: "2", full_name: "فيصل السلمي", board: { position: "chair", category: "non_executive" } },
      { id: "3", full_name: "ثامر علي", committees: [{ name: "لجنة المراجعة", position: "member" }] },
      { id: "4", full_name: "نواف نايف", executive_title: "الرئيس التنفيذي" },
      { id: "5", full_name: "علي محمد", departments: ["الإدارة المالية"] },
      { id: "6", full_name: "مصعب علي" },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["أعضاء مجلس الإدارة", "أعضاء اللجان", "الإدارة التنفيذية", "الإدارة المالية", "أشخاص آخرون"]);
    expect(groups[0].people.map((p) => p.full_name)).toEqual(["فيصل السلمي", "طلال محمد"]);
    expect(groups[0].people[0].role).toBe("رئيس المجلس · غير تنفيذي");
    expect(groups[0].people[1].role).toBe("عضو · مستقل · رئيس لجنة المراجعة");
    expect(groups[1].people[0].role).toBe("عضو لجنة المراجعة");
  });
});
