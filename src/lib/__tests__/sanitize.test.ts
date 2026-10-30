import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips scripts and event handlers but keeps article markup", () => {
    const dirty =
      '<p onclick="alert(1)">Hello <b>world</b></p><script>alert(1)</script><img src=x onerror=alert(1)>';
    const clean = sanitizeHtml(dirty);

    expect(clean).toBe('<p>Hello <b>world</b></p><img src="x" />');
  });

  it("drops embedded frames, styles and dangerous URLs", () => {
    const clean = sanitizeHtml(
      '<iframe src="https://evil.example"></iframe><style>body{display:none}</style><a href="javascript:alert(1)">x</a><img src="javascript:alert(1)">'
    );

    expect(clean).not.toContain("iframe");
    expect(clean).not.toContain("style");
    expect(clean).not.toContain("javascript:");
  });

  it("keeps reading markup and marks external links noopener", () => {
    const clean = sanitizeHtml(
      '<h2>Title</h2><p class="ql-align-center">Body</p><a href="https://example.com" target="_blank">link</a>'
    );

    expect(clean).toContain("<h2>Title</h2>");
    expect(clean).toContain('class="ql-align-center"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it("keeps inline alignment styles WordPress content already relies on", () => {
    const clean = sanitizeHtml('<p style="text-align: center;">Centered</p>');

    expect(clean).toContain('style="text-align:center"');
    expect(clean).toContain("Centered");
  });
});
