import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips scripts and event handlers but keeps article markup", () => {
    const dirty =
      '<p onclick="alert(1)">Hello <b>world</b></p><script>alert(1)</script><img src=x onerror=alert(1)>';
    const clean = sanitizeHtml(dirty);

    expect(clean).toBe('<p>Hello <b>world</b></p><img src="x">');
  });
});
