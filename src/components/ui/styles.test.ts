import { describe, expect, it } from "vitest";
import { inputWith } from "./styles";

describe("inputWith", () => {
  it("drops the base width or padding an extra class replaces", () => {
    expect(inputWith("w-24")).not.toContain("w-full");
    expect(inputWith("ps-9")).toMatch(/pe-3/);
    expect(inputWith("ps-9")).not.toMatch(/\bpx-3\b/);
    expect(inputWith("p-0")).not.toMatch(/\bpx-3\b|\bpy-2\b/);
    expect(inputWith("mt-1")).toContain("w-full");
  });
});
