import { describe, expect, it } from "vitest";
import { activeLink, buildSidebar } from "./sidebar";

const all = ["/", "/my-tasks", "/board", "/committees", "/meetings", "/minutes", "/resolutions", "/documents", "/governance-office", "/admin/users"];

describe("buildSidebar", () => {
  it("lists each committee with its own pages", () => {
    const s = buildSidebar(all, [{ id: "c1", name: "لجنة المراجعة" }]);
    const committees = s.find((x) => x.label === "اللجان")!;
    const branch = committees.items[1] as { label: string; children: { href: string }[] };
    expect(branch.label).toBe("لجنة المراجعة");
    expect(branch.children.map((c) => c.href)).toContain("/committees/c1/meetings");
  });

  it("hides what the viewer may not open, and empty sections", () => {
    const s = buildSidebar(["/", "/board"], []);
    expect(s.map((x) => x.label)).toEqual(["عام", "مجلس الإدارة"]);
    expect(s[1].items.map((i) => i.href)).toEqual(["/board", "/board/members", "/resolutions/circular?body=board"]);
  });
});

it("finds the active link by the longest prefix", () => {
  const s = buildSidebar(all, [{ id: "c1", name: "ل" }]);
  expect(activeLink(s, "/board/members/new")).toBe("/board/members");
  expect(activeLink(s, "/committees/c1/minutes")).toBe("/committees/c1/minutes");
  expect(activeLink(s, "/committees/c1")).toBe("/committees/c1");
  expect(activeLink(s, "/")).toBe("/");
  expect(activeLink(s, "/meetings/xyz")).toBeUndefined();
  expect(activeLink(s, "/resolutions/circular", "body=committee:c1")).toBe("/resolutions/circular?body=committee:c1");
});
