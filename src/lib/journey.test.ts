import { describe, expect, it } from "vitest";
import { blocking, currentStage, journeyChecks, stageDone, type JourneyInput } from "./journey";

const base: JourneyInput = {
  today: "2026-10-15",
  companyType: "listed_jsc",
  inviteDays: 5,
  isBoard: true,
  boardTermEnd: "2029-12-31",
  secretary: true,
  meeting: { status: "draft", live_status: "not_started", starts_at: "2026-10-20T07:00:00Z", mode: "in_person", location: "القاعة", virtual_link: null, pack_published_at: null, meeting_type: "regular" },
  items: [],
  requests: [],
  invitedMembers: 5,
  quorumNeeded: 3,
  minutes: null,
  unratifiedCirculars: 0,
  resolutionsWithoutTasks: 0,
  overrides: {},
};
const find = (i: JourneyInput, id: string) => journeyChecks(i).find((c) => c.id === id)!;

describe("meeting journey", () => {
  it("cannot leave preparation without an agenda", () => {
    expect(currentStage(journeyChecks(base))).toBe(1);
    expect(find(base, "items").ok).toBe(false);
  });

  it("requires an owner for every decision item", () => {
    const i = { ...base, items: [{ title: "القوائم المالية", kind: "decision", owned: false }] };
    expect(find(i, "owners").detail).toContain("القوائم المالية");
    expect(currentStage(journeyChecks({ ...i, items: [{ ...i.items[0], owned: true }] }))).toBe(2);
  });

  it("blocks items left with a choice or a blank", () => {
    const i = { ...base, items: [{ title: "التوصية بزيادة/تخفيض رأس المال", kind: "information", owned: true }] };
    expect(find(i, "definite").ok).toBe(false);
    expect(currentStage(journeyChecks(i))).toBe(1);
    expect(find({ ...i, items: [{ ...i.items[0], title: "التوصية بزيادة رأس المال" }] }, "definite").ok).toBe(true);
  });

  it("requires item requirements to be sent, and checks confirmed or explained", () => {
    const i = { ...base, items: [{ title: "أ", kind: "information", owned: true }], requirements: { unsent: 2, unchecked: ["التحقق من عدم وجود مصلحة"] } };
    expect(find(i, "requirements-sent").ok).toBe(false);
    expect(currentStage(journeyChecks(i))).toBe(1);
    const sent = { ...i, requirements: { unsent: 0, unchecked: ["التحقق من عدم وجود مصلحة"] } };
    expect(blocking(find(sent, "requirements-checks"))).toBe(true);
    expect(blocking(find({ ...sent, overrides: { "requirements-checks": "يُعرض في الاجتماع" } }, "requirements-checks"))).toBe(false);
  });

  it("lets a pending document pass only with a reason", () => {
    const i = { ...base, items: [{ title: "أ", kind: "information", owned: false }], requests: [{ title: "القوائم", status: "requested" }] };
    expect(currentStage(journeyChecks(i))).toBe(1);
    expect(currentStage(journeyChecks({ ...i, overrides: { docs: "يُعرض في الاجتماع" } }))).toBe(2);
  });

  it("warns on short notice for listed companies but not for extraordinary meetings", () => {
    const published = { ...base.meeting, status: "scheduled", pack_published_at: "2026-10-18T07:00:00Z" };
    expect(blocking(find({ ...base, meeting: published }, "notice"))).toBe(true);
    expect(blocking(find({ ...base, meeting: { ...published, meeting_type: "extraordinary" } }, "notice"))).toBe(false);
    expect(blocking(find({ ...base, companyType: "unlisted_jsc", meeting: published }, "notice"))).toBe(false);
  });

  it("finishes when the minutes are approved", () => {
    const done = { ...base, items: [{ title: "أ", kind: "information", owned: false }], meeting: { ...base.meeting, status: "scheduled", live_status: "ended", pack_published_at: "2026-10-01T07:00:00Z" }, minutes: { status: "approved", gaps: [] } };
    expect(stageDone(journeyChecks(done), 4)).toBe(true);
    expect(stageDone(journeyChecks({ ...done, minutes: { status: "review", gaps: [] } }), 4)).toBe(false);
  });
});
