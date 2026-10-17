import { describe, expect, it } from "vitest";
import { isTestDepartment, isTestPerson } from "./test-data";

describe("test data names", () => {
  it("matches only what the tests create", () => {
    expect(isTestPerson("عضو اختبار 67370")).toBe(true);
    expect(isTestPerson("عضو مجلس 2 (اختبار)")).toBe(true);
    expect(isTestPerson("مدير تنفيذي 35626")).toBe(true);
    expect(isTestPerson("مستخدم الاختبار")).toBe(false);
    expect(isTestPerson("خالد الخالد")).toBe(false);
    expect(isTestDepartment("إدارة اختبار 55302")).toBe(true);
    expect(isTestDepartment("الادارة المالية")).toBe(false);
  });
});
