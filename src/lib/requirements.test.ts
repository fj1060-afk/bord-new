import { describe, expect, it } from "vitest";
import { departmentFor, isRequirementsOnly, needsText, planSync, requirementsText, unassigned, withoutRequirements, type Req, type ReqRow } from "./requirements";

const reqs: Req[] = [
  { k: "doc", ar: "مسودة العقد", en: "Draft contract", from: "owner" },
  { k: "rec", ar: "توصية لجنة المراجعة", en: "Audit committee recommendation", from: "audit" },
  { k: "check", ar: "التحقق من عدم وجود مصلحة لعضو", en: "Confirm no member interest", auto: "conflict" },
  { k: "after", ar: "الإفصاح الفوري", en: "Immediate disclosure", due: "immediate" },
];
const row = (label: string, extra: Partial<ReqRow> = {}): ReqRow => ({ id: label, label, kind: "doc", custom: false, status: "draft", department_id: null, assignee_user_id: null, ...extra });

describe("requirements", () => {
  it("lists only before-meeting requirements as needs", () => {
    expect(needsText(reqs)).toBe("مسودة العقد؛ توصية لجنة المراجعة؛ التحقق من عدم وجود مصلحة لعضو");
  });

  it("drafts what is missing and keeps sent, dismissed and hand-added rows", () => {
    const plan = planSync(reqs, [row("مسودة العقد", { status: "sent" }), row("قديم"), row("قديم مرسل", { status: "sent" }), row("مستبعد قديم", { status: "dismissed" }), row("يدوي", { custom: true })]);
    expect(plan.insert.map((r) => r.ar)).toEqual(["توصية لجنة المراجعة", "التحقق من عدم وجود مصلحة لعضو"]);
    expect(plan.remove).toEqual(["قديم"]);
    expect(plan.obsolete).toEqual(["قديم مرسل"]);
  });

  it("removes every draft when the item no longer follows a wording", () => {
    expect(planSync([], [row("أ"), row("ب", { custom: true })]).remove).toEqual(["أ"]);
  });

  it("finds drafts with nobody to ask", () => {
    expect(unassigned([row("أ"), row("ب", { department_id: "d" }), row("ج", { kind: "check" })]).map((r) => r.id)).toEqual(["أ"]);
  });

  it("matches functions to departments by name", () => {
    const deps = [{ id: "1", name: "الإدارة المالية" }, { id: "2", name: "الشؤون القانونية" }];
    expect(departmentFor("finance", deps)).toBe("1");
    expect(departmentFor("legal", deps)).toBe("2");
    expect(departmentFor("hr", deps)).toBeNull();
  });

  it("groups the description block by who provides each requirement", () => {
    expect(requirementsText(reqs)).toBe(
      ["المتطلبات قبل الاجتماع:", "• من المسؤول عن البند: مسودة العقد", "• من لجنة المراجعة: توصية لجنة المراجعة", "• يتحقق منه أمين السر: التحقق من عدم وجود مصلحة لعضو", "بعد القرار:", "• الإفصاح الفوري (فوراً)"].join("\n"),
    );
    expect(requirementsText(reqs, true)).toContain("• From the Audit Committee: Audit committee recommendation");
  });

  it("recognizes and strips auto-filled blocks", () => {
    const block = requirementsText(reqs);
    expect(isRequirementsOnly(block)).toBe(true);
    expect(isRequirementsOnly("المستندات الداعمة: أ؛ ب")).toBe(true);
    expect(isRequirementsOnly(`ملاحظة الأمين\n${block}`)).toBe(false);
    expect(withoutRequirements(`ملاحظة الأمين\n${block}`)).toBe("ملاحظة الأمين");
  });
});
