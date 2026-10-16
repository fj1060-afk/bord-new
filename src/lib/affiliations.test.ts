import { describe, expect, it } from "vitest";
import { affiliationNotices, listedSeats, nameCore, namesCompany, type Affiliation } from "./affiliations";

describe("company names", () => {
  it("keeps the distinctive words", () => {
    expect(nameCore("شركة المراعي القابضة")).toEqual(["مراعي"]);
    expect(nameCore("Saudi Aramco Company")).toEqual(["saudi", "aramco"]);
    expect(nameCore("شركة ذات مسؤولية محدودة")).toEqual([]);
  });

  it("finds a company in an item, with Arabic prefixes and spelling variants", () => {
    expect(namesCompany("التصويت على التعاقد مع شركة المراعي لتوريد", "المراعي")).toBe(true);
    expect(namesCompany("عقد توريد للمراعي", "شركة المراعي القابضة")).toBe(true);
    expect(namesCompany("التصويت على عقد مع شركة الأفق للتقنية", "شركة الافق للتقنيه")).toBe(true);
    expect(namesCompany("التصويت على عقد مع شركة الأفق العقارية", "شركة الافق للتقنية")).toBe(false);
    expect(namesCompany("اعتماد القوائم المالية", "شركة")).toBe(false);
  });
});

describe("affiliationNotices", () => {
  const cv: Affiliation[] = [
    { name: "خالد", organization: "شركة الأفق للتقنية", role: "chair", current: true },
    { name: "خالد", organization: "مجموعة الأفق للتقنية", role: "partner", current: true },
    { name: "سارة", organization: "شركة الأفق للتقنية", role: "employee", current: false },
    { name: "سارة", organization: "شركة مجلس", role: "ceo", current: true },
  ];

  it("names each member once per company, with current positions only", () => {
    expect(affiliationNotices("التعاقد مع شركة الأفق للتقنية", cv)).toEqual([{ name: "خالد", organization: "شركة الأفق للتقنية", role: "رئيس مجلس الإدارة" }]);
  });

  it("ignores positions in the company itself", () => {
    expect(affiliationNotices("اعتماد خطة شركة مجلس", cv, "شركة مجلس")).toEqual([]);
  });
});

it("counts listed board seats", () => {
  const seats = [
    { role: "board_member" as const, listed: true, current: true },
    { role: "chair" as const, listed: true, current: true },
    { role: "ceo" as const, listed: true, current: true },
    { role: "board_member" as const, listed: true, current: false },
  ];
  expect(listedSeats(seats, true)).toBe(3);
});
