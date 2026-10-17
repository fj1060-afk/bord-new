import { describe, expect, it } from "vitest";
import { duplicateFields } from "./user-duplicates";

const users = [
  { id: "1", full_name: "فيصل السلمي", email: "test3@test.com", phone: "+966555999999" },
  { id: "2", full_name: "خالد الخالد", email: "test1@test.com", phone: null },
];

describe("duplicateFields", () => {
  it("catches the same email, number or name however typed", () => {
    expect(duplicateFields({ email: " TEST3@test.com " }, users).map((d) => d.field)).toEqual(["email"]);
    expect(duplicateFields({ phone: "0555999999" }, users).map((d) => d.field)).toEqual(["phone"]);
    expect(duplicateFields({ name: "فيصل  السلمى" }, users).map((d) => d.field)).toEqual(["name"]);
  });
  it("passes a new person and ignores the user being edited", () => {
    expect(duplicateFields({ name: "سعد", email: "new@x.com", phone: "0501112222" }, users)).toEqual([]);
    expect(duplicateFields({ email: "test3@test.com" }, users, "1")).toEqual([]);
  });
});
