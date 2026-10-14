import { describe, expect, it } from "vitest";
import { activeNavItem, navItems } from "./navigation";
import { phases } from "./phases";

describe("navigation", () => {
  it("has unique links", () => {
    const hrefs = navItems.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("assigns every page to an existing phase", () => {
    const numbers = new Set(phases.map((phase) => phase.number));
    for (const item of navItems) expect(numbers.has(item.phase)).toBe(true);
  });

  it("matches the home page only exactly", () => {
    expect(activeNavItem("/")?.href).toBe("/");
    expect(activeNavItem("/unknown")).toBeUndefined();
  });

  it("matches nested pages to their section", () => {
    expect(activeNavItem("/meetings/abc")?.href).toBe("/meetings");
    expect(activeNavItem("/admin/users")?.href).toBe("/admin/users");
    expect(activeNavItem("/admin")).toBeUndefined();
  });
});
