import { describe, expect, it } from "vitest";
import { PASSWORD_POLICY, passwordProblem, passwordRules } from "./password";

describe("password policy", () => {
  it("asks only for the minimum length during testing", () => {
    expect(passwordProblem("abc12")).toContain("6 أحرف");
    expect(passwordProblem("abc123")).toBeNull();
  });
  it("applies the stricter rules once switched on", () => {
    const strict = { ...PASSWORD_POLICY, minLength: 8, requireUpper: true, requireDigit: true, requireSymbol: true, avoidPersonal: true };
    expect(passwordRules("Fahad2026!", { name: "فهد", email: "fahad@x.com" }, strict).filter((r) => !r.ok).map((r) => r.id)).toEqual(["personal"]);
    expect(passwordProblem("Strong#Pass9", { email: "fahad@x.com" }, strict)).toBeNull();
  });
});
