import { describe, expect, it } from "vitest";
import { activeGrant, authorityFindings, grantExpiry, type AuthorityTemplate, type Powers } from "./authority";

const loans: AuthorityTemplate = {
  title: "التصويت على الموافقة على اتفاقية تسهيلات مع (…) بمبلغ (…) ريال",
  authority: "bylaws",
  power: "loans",
  authorityRef: "نظام الشركات م74",
  alt: { title: "التوصية للجمعية العامة العادية بالموافقة على اتفاقية تسهيلات مع (…) بمبلغ (…) ريال", en: "x (…) (…)" },
};
const interim: AuthorityTemplate = { title: "التصويت على توزيع أرباح مرحلية بواقع (…) ريال", authority: "board_authorized", power: "interim_dividends", alt: { title: "التوصية للجمعية العامة العادية بتوزيع أرباح مرحلية بواقع (…) ريال", en: "x (…)" } };
const none: Powers = { restricted: [], grants: [], today: "2026-10-16" };

describe("authority", () => {
  it("asks for a recommendation when the bylaws restrict the power, keeping typed values", () => {
    const title = "التصويت على الموافقة على اتفاقية تسهيلات مع البنك الأهلي بمبلغ 5,000,000 ريال";
    expect(authorityFindings(loans, title, none)[0].level).toBe("tip");
    const [f] = authorityFindings(loans, title, { ...none, restricted: ["loans"] });
    expect(f.level).toBe("warn");
    expect(f.fixes).toEqual(["التوصية للجمعية العامة العادية بالموافقة على اتفاقية تسهيلات مع البنك الأهلي بمبلغ 5,000,000 ريال"]);
  });

  it("requires a current assembly authorization", () => {
    expect(authorityFindings(interim, "التصويت على توزيع أرباح مرحلية بواقع 1 ريال", none)[0].level).toBe("warn");
    const granted = { ...none, grants: [{ kind: "interim_dividends" as const, granted_on: "2026-05-01", expires_on: null }] };
    expect(authorityFindings(interim, "التصويت على توزيع أرباح مرحلية بواقع 1 ريال", granted)[0].level).toBe("tip");
    expect(activeGrant({ ...granted, today: "2027-05-02" }, "interim_dividends")).toBeUndefined();
    expect(grantExpiry({ kind: "related_party", granted_on: "2026-05-01", expires_on: null })).toBe("2027-05-01");
  });

  it("flags assembly matters worded as board decisions", () => {
    const t: AuthorityTemplate = { title: "x", authority: "ga_extraordinary" };
    expect(authorityFindings(t, "التصويت على زيادة رأس المال")[0].level).toBe("warn");
    expect(authorityFindings(t, "التوصية للجمعية العامة غير العادية بزيادة رأس المال")).toEqual([]);
  });
});
