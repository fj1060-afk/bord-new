import { describe, expect, it } from "vitest";
import { inviteText, packDeadline, packMail, requestsMail } from "./meeting-mail";

const m = { title: "الاجتماع رقم 24", body: "مجلس الإدارة", startsAt: "2026-12-20T07:00:00Z", place: "قاعة المجلس", url: "https://x/meetings/1", secretary: "سارة" };

describe("meeting mail", () => {
  it("lists a person's requests with their deadlines", () => {
    const mail = requestsMail(m, "المدير المالي", [{ item: "اعتماد القوائم", label: "تقرير المراجع", due: "2026-12-13" }], "https://x/my-tasks");
    expect(mail.subject).toBe("طلب مستندات: الاجتماع رقم 24 (مجلس الإدارة)");
    expect(mail.body).toContain("1. تقرير المراجع\n   البند: اعتماد القوائم\n   آخر موعد: 2026-12-13");
    expect(mail.body).toContain("https://x/my-tasks");
    expect(mail.body.endsWith("سارة")).toBe(true);
  });

  it("numbers the agenda in the invitation and pack", () => {
    expect(inviteText(m, ["أ", "ب"])).toContain("جدول الأعمال:\n1. أ\n2. ب");
    expect(packMail(m, [{ title: "أ", documents: ["القوائم", "التقرير"] }]).body).toContain("1. أ\n   المستندات: القوائم، التقرير");
  });

  it("computes the statutory sending deadline", () => {
    expect(packDeadline("2026-12-20T07:00:00Z", 5)).toBe("2026-12-15");
  });
});
