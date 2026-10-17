import { describe, expect, it } from "vitest";
import { parseMotionValue } from "./motion";

describe("parseMotionValue", () => {
  it("reads ms, s and px tokens", () => {
    expect(parseMotionValue(" 220ms", 0)).toBe(220);
    expect(parseMotionValue("0.3s", 0)).toBe(300);
    expect(parseMotionValue("10px", 0)).toBe(10);
    expect(parseMotionValue("", 150)).toBe(150);
  });
});
