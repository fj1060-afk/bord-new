import { describe, expect, it } from "vitest";
import { fileSize } from "./library";

describe("library", () => {
  it("formats file sizes", () => {
    expect(fileSize(500)).toBe("1 KB");
    expect(fileSize(340 * 1024)).toBe("340 KB");
    expect(fileSize(1.25 * 1024 * 1024)).toBe("1.3 MB");
    expect(fileSize(null)).toBe("");
  });
});
