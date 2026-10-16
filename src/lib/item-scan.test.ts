import { describe, expect, it } from "vitest";
import { scanItem } from "./item-scan";
import { templates } from "./item-templates";

const std = templates();

describe("scanItem", () => {
  it("passes a well-formed item", () => {
    const r = scanItem({ title: "التصويت على اعتماد خطة السلامة المهنية لعام 2027", en: "Approving the occupational safety plan for 2027", kind: "decision", body: "board" }, std);
    expect(r.passed).toBe(true);
    expect(r.findings).toEqual([]);
  });

  it("flags assembly matters worded as a board decision", () => {
    const r = scanItem({ title: "التصويت على زيادة رأس المال", kind: "decision", body: "board" }, std);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.ref === "نظام الشركات م85")).toBe(true);
  });

  it("flags a vote that is not a decision, and committee items addressed to the assembly", () => {
    expect(scanItem({ title: "التصويت على اعتماد الهيكل", kind: "information", body: "board", en: "x" }, std).passed).toBe(false);
    expect(scanItem({ title: "التوصية للجمعية العامة العادية بتعيين المراجع", kind: "decision", body: "audit", en: "x" }, std).findings.some((f) => f.text.startsWith("اللجان"))).toBe(true);
  });

  it("points to an equivalent standard item", () => {
    expect(scanItem({ title: "التصويت على اعتماد محضر الاجتماع السابق للمجلس", kind: "decision", body: "board" }, std).similar).toBe("التصويت على اعتماد محضر الاجتماع السابق");
  });
});
