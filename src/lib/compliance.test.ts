import { describe, expect, it } from "vitest";
import { bindingLevel, evaluate, score, type Snapshot } from "./compliance";

const member = (id: string, category: string, position = "member") => ({ person_id: id, name: id, category, position });
const base: Snapshot = {
  today: "2026-10-14",
  profile: { company_type: "listed_jsc", min_board_meetings: 4, invite_days: 5, secretary_person_id: "s" },
  board: { id: "b", term_end: "2028-12-31" },
  boardMembers: [member("a", "independent", "chair"), member("b", "independent"), member("c", "independent"), member("d", "non_executive"), member("e", "executive")],
  committees: [],
  meetings: ["2026-01-10", "2026-04-10", "2026-07-10", "2026-09-20"].map((d, i) => ({ id: `m${i}`, body: "board", starts_at: `${d}T07:00:00Z`, ended: true, extraordinary: false, pack_published_at: `${d.slice(0, 8)}01T07:00:00Z` })),
  attendance: [],
  disclosed: ["a", "b", "c", "d", "e"],
};
const find = (s: Snapshot, id: string) => evaluate(s).find((f) => f.id.startsWith(id));

describe("compliance", () => {
  it("binds sources by company type", () => {
    expect(bindingLevel("cma", "listed_jsc")).toBe("mandatory");
    expect(bindingLevel("cma", "unlisted_jsc")).toBe("guidance");
    expect(bindingLevel("law", "llc")).toBe("guidance");
    expect(bindingLevel("guide", "listed_jsc")).toBe("guidance");
  });

  it("passes a compliant board, apart from the missing audit committee", () => {
    const failing = evaluate(base).filter((f) => f.status !== "ok").map((f) => f.id);
    expect(failing).toEqual(["audit.exists"]);
  });

  it("flags too few independents, and downgrades it for unlisted companies", () => {
    const s = { ...base, boardMembers: [member("a", "independent"), member("d", "non_executive"), member("e", "non_executive")] };
    expect(find(s, "board.independent")?.status).toBe("violation");
    const unlisted = { ...s, profile: { ...s.profile, company_type: "unlisted_jsc" as const } };
    expect(find(unlisted, "board.independent")).toMatchObject({ status: "warning", level: "guidance" });
  });

  it("flags late notice, long gaps and repeated absence", () => {
    const meetings = base.meetings.map((m, i) => (i === 3 ? { ...m, pack_published_at: "2026-09-18T07:00:00Z" } : m));
    expect(find({ ...base, meetings }, "board.notice")?.status).toBe("violation");
    expect(find({ ...base, today: "2027-01-05", meetings: base.meetings.slice(0, 3) }, "board.quarterly")?.status).toBe("violation");
    const attendance = ["m1", "m2", "m3"].map((id) => ({ meeting_id: id, person_id: "d", status: "absent" }));
    const future = [...base.meetings, { ...base.meetings[0], id: "f", starts_at: "2026-12-20T07:00:00Z" }];
    expect(find({ ...base, meetings: future }, "board.quarterly")?.detail).toContain("24");
    expect(find({ ...base, attendance }, "board.absence")?.detail).toContain("d");
  });

  it("checks the audit committee", () => {
    const committees = [{ id: "x", name: "المراجعة", kind: "audit", members: [{ person_id: "e", name: "e", position: "chair" }, { person_id: "q", name: "q", position: "member" }] }];
    const ids = evaluate({ ...base, committees }).filter((f) => f.status !== "ok").map((f) => f.id.split(".x")[0]);
    expect(ids).toEqual(expect.arrayContaining(["committee.size", "audit.no_executive", "audit.independent_chair"]));
  });

  it("scores mandatory rules only", () => {
    expect(score(evaluate(base))).toBeGreaterThan(80);
  });
});
