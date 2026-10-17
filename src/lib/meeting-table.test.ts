import { describe, expect, it } from "vitest";
import { countdown, durationText, meetingMinutes, meetingState, pageWindow, readTableQuery, tableHref } from "./meeting-table";

describe("meetingState", () => {
  it("puts cancellation and the live session first", () => {
    expect(meetingState({ status: "cancelled", live_status: "ended" })).toBe("cancelled");
    expect(meetingState({ status: "scheduled", live_status: "ended" })).toBe("ended");
    expect(meetingState({ status: "scheduled", live_status: "paused" })).toBe("live");
    expect(meetingState({ status: "draft", live_status: "not_started" })).toBe("draft");
    expect(meetingState({ status: "scheduled", live_status: null })).toBe("scheduled");
  });
});

describe("meetingMinutes", () => {
  it("uses the real run time once ended", () => {
    expect(meetingMinutes({ duration_minutes: 60, started_at: "2026-01-01T10:00:00Z", ended_at: "2026-01-01T11:30:00Z" })).toEqual({ minutes: 90, actual: true });
    expect(meetingMinutes({ duration_minutes: 60, started_at: null, ended_at: null })).toEqual({ minutes: 60, actual: false });
  });
});

describe("readTableQuery", () => {
  it("drops bad values", () => {
    const q = readTableQuery({ state: "x", show: "past", size: "7", page: "-2", body: "board:1" });
    expect(q).toEqual({ q: "", body: "", state: "", period: "past", page: 1, size: 20 });
  });
  it("keeps a valid body", () => {
    const id = "6f1c2a4e-1111-4222-8333-944455556666";
    expect(readTableQuery({ body: `committee:${id}` }).body).toBe(`committee:${id}`);
  });
});

describe("tableHref", () => {
  it("resets the page and leaves defaults out", () => {
    const q = readTableQuery({ page: "3", q: "ميزانية" });
    expect(tableHref("/meetings", q, { state: "ended" })).toBe("/meetings?q=%D9%85%D9%8A%D8%B2%D8%A7%D9%86%D9%8A%D8%A9&state=ended");
    expect(tableHref("/meetings", q, { page: 4 })).toContain("page=4");
  });
});

describe("pageWindow", () => {
  it("shows every page when few", () => expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]));
  it("folds the middle when many", () => expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]));
  it("handles the edges", () => expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]));
});

describe("durationText", () => {
  it("says the length in words", () => {
    expect(durationText(120)).toBe("ساعتان");
    expect(durationText(60)).toBe("ساعة");
    expect(durationText(90)).toBe("ساعة ونصف");
    expect(durationText(180)).toBe("3 ساعات");
    expect(durationText(45)).toBe("45 دقيقة");
    expect(durationText(75)).toBe("ساعة و15 دقيقة");
  });
});

describe("countdown", () => {
  it("splits the time left and stops at zero", () => {
    const now = Date.parse("2026-10-17T16:20:00Z");
    expect(countdown(Date.parse("2026-10-24T07:00:00Z"), now)).toEqual({ days: 6, hours: 14, minutes: 40 });
    expect(countdown(now - 1000, now)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});
