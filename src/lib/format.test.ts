import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatGregorianDate,
  formatHijriDate,
  formatNumber,
  toLatinDigits,
} from "./format";

const latinOnly = /^[^٠-٩۰-۹]*$/;

describe("format", () => {
  const date = new Date("2026-10-14T12:00:00Z");

  it("formats numbers with Latin digits", () => {
    expect(formatNumber(12345.5)).toBe("12,345.5");
  });

  it("formats the Gregorian date in Arabic with Latin digits", () => {
    const text = formatGregorianDate(date);
    expect(text).toContain("أكتوبر");
    expect(text).toContain("2026");
    expect(text).toMatch(latinOnly);
  });

  it("formats the Umm al-Qura Hijri date with Latin digits", () => {
    const text = formatHijriDate(date);
    expect(text).toContain("1448");
    expect(text).toMatch(latinOnly);
  });

  it("uses Saudi time near midnight UTC", () => {
    // 22:30 UTC on the 14th is already the 15th in Riyadh.
    expect(formatGregorianDate(new Date("2026-10-14T22:30:00Z"))).toContain("15");
  });

  it("formats date and time in Saudi time with Latin digits", () => {
    const text = formatDateTime(new Date("2026-10-14T12:05:00Z"));
    expect(text).toContain("3:05");
    expect(text).toMatch(latinOnly);
  });

  it("converts Arabic-Indic and Persian digits to Latin", () => {
    expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toLatinDigits("۴۵۶")).toBe("456");
    expect(toLatinDigits("رقم 12")).toBe("رقم 12");
  });
});
