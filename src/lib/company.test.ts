import { describe, expect, it } from "vitest";
import { profileWarnings, quorumNeeded, quorumRule } from "./company";

describe("company", () => {
  it("computes the quorum", () => {
    expect(quorumNeeded(7)).toBe(4);
    expect(quorumNeeded(7, { percent: 50, minPresent: 3 })).toBe(4);
    expect(quorumNeeded(4, { percent: 50, minPresent: 3 })).toBe(3);
    expect(quorumNeeded(9, { percent: 75, minPresent: 3 })).toBe(7);
    expect(quorumNeeded(2, { percent: 50, minPresent: 3 })).toBe(2);
  });

  it("applies the profile to board meetings only", () => {
    const p = { quorum_percent: 60, quorum_min_present: 3 };
    expect(quorumRule(p, true)).toEqual({ percent: 60, minPresent: 3 });
    expect(quorumRule(p, false)).toEqual({ percent: 50, minPresent: 1 });
  });

  it("warns below statutory floors", () => {
    expect(profileWarnings({ company_type: "listed_jsc", min_board_meetings: 2, invite_days: 3 })).toHaveLength(2);
    expect(profileWarnings({ company_type: "llc", min_board_meetings: 2, invite_days: 3 })).toHaveLength(0);
  });
});
