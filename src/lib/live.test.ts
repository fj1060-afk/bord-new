import { describe, expect, it } from "vitest";
import { elapsedSeconds, formatDuration, nextPendingItem, quorum } from "./live";

describe("quorum", () => {
  const members = ["a", "b", "c", "d", "e"];

  it("needs at least half of the members by default", () => {
    const q = quorum({ members, attendance: { a: "present", b: "remote" }, proxies: [] });
    expect(q).toEqual({ members: 5, counted: 2, required: 3, met: false });
    expect(quorum({ members, attendance: { a: "present", b: "remote", c: "present" }, proxies: [] }).met).toBe(true);
  });

  it("counts a proxy only when its holder attends", () => {
    const attendance = { a: "present", b: "present", c: "proxy", d: "proxy" } as const;
    const q = quorum({ members, attendance, proxies: [{ grantor: "c", holder: "a" }, { grantor: "d", holder: "e" }] });
    expect(q.counted).toBe(3);
    expect(q.met).toBe(true);
  });

  it("ignores excused and absent members and honours an override", () => {
    const q = quorum({ members, attendance: { a: "present", b: "excused", c: "absent" }, proxies: [], required: 1 });
    expect(q).toMatchObject({ counted: 1, required: 1, met: true });
  });

  it("is never met without members", () => {
    expect(quorum({ members: [], attendance: {}, proxies: [] }).met).toBe(false);
  });
});

describe("timing", () => {
  const start = "2026-11-01T07:00:00Z";
  const now = Date.parse("2026-11-01T08:00:00Z");

  it("excludes finished and open breaks", () => {
    const breaks = [
      { started_at: "2026-11-01T07:20:00Z", ended_at: "2026-11-01T07:30:00Z" },
      { started_at: "2026-11-01T07:55:00Z", ended_at: null },
    ];
    expect(elapsedSeconds(start, null, breaks, now)).toBe(45 * 60);
    expect(elapsedSeconds(null, null, [], now)).toBe(0);
    expect(elapsedSeconds(start, "2026-11-01T07:40:00Z", breaks.slice(0, 1), now)).toBe(30 * 60);
  });

  it("formats durations", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(0)).toBe("0:00");
  });

  it("finds the next pending item", () => {
    const items = [
      { id: "1", position: 1, status: "discussed" },
      { id: "2", position: 2, status: "pending" },
      { id: "3", position: 3, status: "deferred" },
      { id: "4", position: 4, status: "pending" },
    ];
    expect(nextPendingItem(items, null)?.id).toBe("2");
    expect(nextPendingItem(items, "2")?.id).toBe("4");
    expect(nextPendingItem(items, "4")?.id).toBe("2");
    expect(nextPendingItem(items.map((i) => ({ ...i, status: "discussed" })), "4")).toBeNull();
  });
});
