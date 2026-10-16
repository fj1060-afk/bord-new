import { describe, expect, it } from "vitest";
import { icsInvite, mailto, MAILTO_LIMIT, outlookWebInvite } from "./outlook";

const invite = {
  uid: "m1@bord",
  title: "اجتماع مجلس الإدارة رقم 24",
  start: new Date("2026-12-20T07:00:00Z"),
  minutes: 120,
  location: "قاعة المجلس",
  description: "جدول الأعمال:\n1. اعتماد المحضر",
  organizer: { name: "أمين السر", email: "sec@co.sa" },
  attendees: [{ name: "خالد", email: "k@co.sa" }],
};

describe("outlook", () => {
  it("builds a mailto link and falls back when the body is too long", () => {
    const short = mailto({ to: ["a@co.sa", "b@co.sa"], subject: "طلب", body: "سطر\nسطر" });
    expect(short.fits).toBe(true);
    expect(short.href).toContain("mailto:a%40co.sa,b%40co.sa?subject=");
    expect(short.href).toContain("%0D%0A");
    const long = mailto({ to: ["a@co.sa"], subject: "طلب", body: "نص طويل ".repeat(200) });
    expect(long.fits).toBe(false);
    expect(long.href.length).toBeLessThan(MAILTO_LIMIT);
  });

  it("builds a valid meeting request", () => {
    const ics = icsInvite(invite);
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("DTSTART:20261220T070000Z");
    expect(ics).toContain("DTEND:20261220T090000Z");
    expect(ics).toContain("mailto:k@co.sa");
    expect(ics).toContain("\\n1. اعتماد المحضر");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("builds an Outlook web compose link", () => {
    const url = outlookWebInvite(invite);
    expect(url).toContain("outlook.office.com/calendar/0/deeplink/compose?");
    expect(url).toContain("to=k%40co.sa");
  });
});
