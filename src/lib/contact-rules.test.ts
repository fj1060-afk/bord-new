import { describe, expect, it } from "vitest";
import { clampPhone, contactFields, emailProblem, formatPhone, normalizeEmail, normalizePhone, phoneProblem, phoneShortBy } from "./contact-rules";

describe("email rules", () => {
  it("accepts ordinary addresses and normalizes them", () => {
    expect(emailProblem(" Fahad.Ali@Company.com.sa ")).toBeNull();
    expect(normalizeEmail(" Fahad@Company.COM ")).toBe("fahad@company.com");
  });
  it("rejects malformed addresses with a reason", () => {
    expect(emailProblem("fahad@company")).toContain("امتداد");
    expect(emailProblem("fahad company.com")).toContain("مسافات");
    expect(emailProblem("fahad@@company.com")).toContain("@");
    expect(emailProblem("فهد@company.com")).toContain("إنجليزية");
    expect(emailProblem("fahad..x@company.com")).toContain("قبل @");
    expect(emailProblem("")).toBeNull();
  });
});

describe("phone rules", () => {
  it("reads Saudi mobiles however they are typed", () => {
    for (const raw of ["0501234567", "501234567", "966501234567", "00966501234567", "+966 50 123 4567", "٠٥٠١٢٣٤٥٦٧"]) expect(normalizePhone(raw)).toBe("+966501234567");
  });
  it("accepts other countries with their code and rejects the rest", () => {
    expect(normalizePhone("+971501234567")).toBe("+971501234567");
    expect(phoneProblem("0111234567")).not.toBeNull(); // a landline, not a mobile
    expect(phoneProblem("+966111234567")).not.toBeNull();
    expect(phoneProblem("12345")).not.toBeNull();
    expect(phoneProblem("")).toBeNull();
  });
  it("formats for display", () => expect(formatPhone("+966501234567")).toBe("+966 50 123 4567"));
  it("checks a whole form", () => {
    const f = new FormData();
    f.set("email", "A@B.co");
    f.set("phone", "0501234567");
    expect(contactFields(f)).toEqual({ email: "a@b.co", phone: "+966501234567", problem: null });
  });
});

describe("phone length", () => {
  it("says how many digits are missing", () => {
    expect(phoneShortBy("05012345")).toBe(2);
    expect(phoneProblem("05012345")).toContain("رقمين");
    expect(phoneShortBy("+96650123")).toBe(4);
    expect(phoneShortBy("0501234567")).toBe(0);
  });
  it("stops typing at the limit and drops letters", () => {
    expect(clampPhone("050123456789")).toBe("0501234567");
    expect(clampPhone("+966 50 123 45678")).toBe("+966 50 123 4567");
    expect(clampPhone("05a01-23")).toBe("050123");
    expect(clampPhone("٠٥٠١٢٣٤٥٦٧٨")).toBe("0501234567");
  });
});
