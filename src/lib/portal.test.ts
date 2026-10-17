import { describe, expect, it } from "vitest";
import { byUrgency, isLate, isPortalUser, portalEnabled, stageOf, tally, type PortalRow } from "./portal";

const row = (over: Partial<PortalRow>): PortalRow => ({ id: "x", kind: "document", title: "t", stage: "new", late: false, due: null, context: "", meetingId: null, meetingTitle: null, party: "", href: "", ...over });

describe("portal", () => {
  it("is on in previews and development, off on the live site unless switched on", () => {
    expect(portalEnabled({ VERCEL_ENV: "preview" })).toBe(true);
    expect(portalEnabled({})).toBe(true);
    expect(portalEnabled({ VERCEL_ENV: "production" })).toBe(false);
    expect(portalEnabled({ VERCEL_ENV: "production", REQUESTS_PORTAL: "on" })).toBe(true);
    expect(portalEnabled({ VERCEL_ENV: "preview", REQUESTS_PORTAL: "off" })).toBe(false);
  });

  it("serves department users only", () => {
    expect(isPortalUser((page, level = 1) => (page === "/meetings" && level <= 1) || page === "/my-tasks")).toBe(true);
    expect(isPortalUser((page) => page === "/board")).toBe(false);
    expect(isPortalUser((page, level = 1) => page === "/meetings" && level <= 3)).toBe(false);
  });

  it("maps stored statuses to one set of stages", () => {
    expect(stageOf("document", "requested")).toBe("new");
    expect(stageOf("document", "submitted")).toBe("answered");
    expect(stageOf("document", "returned")).toBe("returned");
    expect(stageOf("document", "accepted")).toBe("done");
    expect(stageOf("document", "in_progress")).toBe("in_progress");
    expect(stageOf("task", "open")).toBe("new");
    expect(stageOf("task", "done")).toBe("done");
    expect(stageOf("task", "cancelled")).toBeNull();
  });

  it("marks overdue apart from the status, never once answered or done", () => {
    expect(isLate("2026-10-11", "new", "2026-10-17")).toBe(true);
    expect(isLate("2026-10-17", "new", "2026-10-17")).toBe(false);
    expect(isLate("2026-10-11", "answered", "2026-10-17")).toBe(false);
    expect(isLate("2026-10-11", "done", "2026-10-17")).toBe(false);
  });

  it("counts tabs and sorts the urgent first", () => {
    const rows = [row({ id: "a", due: "2026-10-20" }), row({ id: "b", late: true, due: "2026-10-11" }), row({ id: "c", stage: "returned" }), row({ id: "d", stage: "done" })];
    expect(tally(rows)).toMatchObject({ all: 4, new: 2, returned: 1, done: 1, late: 1 });
    expect([...rows].sort(byUrgency).map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
  });
});
