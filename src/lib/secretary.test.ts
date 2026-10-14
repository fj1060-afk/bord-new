import { describe, expect, it } from "vitest";
import { circularOutcome, minutesGaps } from "./secretary";

describe("secretary", () => {
  it("lists what the minutes lack", () => {
    const complete = {
      meeting: { started_at: "x", ended_at: "y", location: "القاعة", mode: "in_person" },
      members: ["a", "b"],
      attendance: { a: "present", b: "absent" },
      items: [{ id: "i1", status: "done" }, { id: "i2", status: "deferred" }],
      deliberation: { i1: "نوقش" },
      resolutions: [{ votes_for: 5, votes_against: 0, votes_abstain: 0 }],
    };
    expect(minutesGaps(complete)).toEqual([]);
    const gaps = minutesGaps({ ...complete, meeting: { ...complete.meeting, ended_at: null, location: "" }, attendance: { a: "present" }, deliberation: {}, resolutions: [{ votes_for: null, votes_against: null, votes_abstain: null }] });
    expect(gaps).toHaveLength(5);
    expect(minutesGaps({ ...complete, meeting: { ...complete.meeting, location: null, mode: "virtual" } })).toEqual([]);
  });

  it("decides a circular resolution by an absolute majority", () => {
    expect(circularOutcome(5, [{ vote: "approve" }, { vote: "approve" }, { vote: "approve" }])).toMatchObject({ outcome: "passed", majority: 3 });
    expect(circularOutcome(5, [{ vote: "approve" }, { vote: "reject" }, { vote: "reject" }, { vote: "abstain" }])).toMatchObject({ outcome: "rejected", pending: 1 });
    expect(circularOutcome(4, [{ vote: "approve" }, { vote: "approve" }])).toMatchObject({ outcome: "pending", majority: 3 });
  });
});
