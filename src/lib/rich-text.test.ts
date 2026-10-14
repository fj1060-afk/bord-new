import { describe, expect, it } from "vitest";
import { cleanRich, plainText, richHtml } from "./rich-text";

describe("rich text", () => {
  it("keeps formatting and strips anything unsafe", () => {
    expect(cleanRich('<p onclick="x()">نص <b>غامق</b></p><script>alert(1)</script><img src=x onerror=y>')).toBe("<p>نص <b>غامق</b></p>");
    expect(cleanRich("<div>سطر</div><ul><li>بند</li></ul>")).toBe("<p>سطر</p><ul><li>بند</li></ul>");
  });

  it("stores empty editors as null", () => {
    expect(cleanRich("<p><br></p>")).toBeNull();
  });

  it("renders older plain text", () => {
    expect(richHtml("سطر أول\nسطر <ثان>")).toBe("<p>سطر أول<br>سطر &lt;ثان&gt;</p>");
    expect(plainText("<p>أ</p><ul><li>ب</li></ul>")).toBe("أ\nب");
  });
});
