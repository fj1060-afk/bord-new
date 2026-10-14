import { describe, expect, it } from "vitest";
import { can, clampLevel, levelFor, LEVELS, toPermissions } from "./permissions";

describe("permissions", () => {
  const permissions = toPermissions([
    { page: "/", level: 1 },
    { page: "/admin/users", level: 3 },
    { page: "/meetings", level: 2 },
  ]);

  it("reads the level for a page, defaulting to no access", () => {
    expect(levelFor(permissions, "/meetings")).toBe(2);
    expect(levelFor(permissions, "/board")).toBe(0);
  });

  it("allows a level and everything below it", () => {
    expect(can(permissions, "/meetings")).toBe(true);
    expect(can(permissions, "/meetings", LEVELS.edit)).toBe(true);
    expect(can(permissions, "/meetings", LEVELS.manage)).toBe(false);
    expect(can(permissions, "/board")).toBe(false);
  });

  it("treats missing rows as no permissions", () => {
    expect(can(toPermissions(null), "/")).toBe(false);
  });

  it("clamps invalid levels", () => {
    expect(clampLevel(7)).toBe(3);
    expect(clampLevel(-1)).toBe(0);
    expect(clampLevel(Number.NaN)).toBe(0);
  });
});
