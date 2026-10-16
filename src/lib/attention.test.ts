import { describe, expect, it } from "vitest";
import { daysUntil, dueText, sevByDue, sortAttention, type Attention } from "./attention";

const a = (id: string, sev: Attention["sev"], days: number | null): Attention => ({ id, sev, days, icon: "alert", what: id, where: "", who: "", href: "/", action: "", body: "board", bodyName: "" });

describe("attention", () => {
  it("sorts by severity, then by date", () => {
    expect(sortAttention([a("x", "warn", 3), a("y", "block", 9), a("z", "block", -2), a("w", "tip", null)]).map((i) => i.id)).toEqual(["z", "y", "x", "w"]);
  });
  it("words due dates", () => {
    expect([dueText(0), dueText(-1), dueText(2), dueText(-5), dueText(14), dueText(null)]).toEqual(["اليوم", "تأخر يوم", "خلال يومين", "تأخر 5 أيام", "خلال 14 يوماً", ""]);
  });
  it("counts days in Riyadh time", () => {
    expect(daysUntil("2026-10-18", "2026-10-22")).toBe(4);
    expect(daysUntil("2026-10-18", "2026-10-17T22:30:00Z")).toBe(0);
  });
  it("raises late items", () => {
    expect([sevByDue("tip", -1), sevByDue("tip", 5), sevByDue("tip", 30), sevByDue("block", 30)]).toEqual(["block", "warn", "tip", "block"]);
  });
});
