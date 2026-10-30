import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips scripts and event handlers but keeps article markup", () => {
    const dirty =
      '<p onclick="alert(1)">Hello <b>world</b></p><script>alert(1)</script><img src=x onerror=alert(1)>';
    const clean = sanitizeHtml(dirty);

    expect(clean).toBe('<p>Hello <b>world</b></p><img src="x" />');
  });

  it("drops embedded frames, style tags and dangerous URLs", () => {
    const clean = sanitizeHtml(
      '<iframe src="https://evil.example"></iframe><style>body{display:none}</style><a href="javascript:alert(1)">x</a><img src="javascript:alert(1)">'
    );

    expect(clean).not.toContain("iframe");
    expect(clean).not.toContain("<style");
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
});

/**
 * The style allowlist mirrors the declarations found in real WordPress
 * content (font-weight, font-size, margins, text-align, text-decoration,
 * color, list-style-type). Everything else must be rejected.
 */
describe("sanitizeHtml inline styles", () => {
  it("keeps the formatting WordPress articles actually use", () => {
    const clean = sanitizeHtml(
      '<p style="text-align: center; font-weight: 400; font-size: inherit; margin-top: 0px; margin-bottom: 10px;">a</p>' +
        '<span style="text-decoration: underline; color: #ff0000;">b</span>' +
        '<ul style="list-style-type: none;"><li>c</li></ul>'
    );

    expect(clean).toContain("text-align:center");
    expect(clean).toContain("font-weight:400");
    expect(clean).toContain("font-size:inherit");
    expect(clean).toContain("margin-top:0px");
    expect(clean).toContain("margin-bottom:10px");
    expect(clean).toContain("text-decoration:underline");
    expect(clean).toContain("color:#ff0000");
    expect(clean).toContain("list-style-type:none");
  });

  it("rejects positioning, overlays and CSS URLs", () => {
    const clean = sanitizeHtml(
      '<div style="position: fixed; top: 0; left: 0; z-index: 9999; width: 100vw;" id="overlay">' +
        '<p style="background: url(https://evil.example/pixel.png);">track</p>' +
        '<p style="background-image: url(javascript:alert(1)); color: url(javascript:alert(1));">steal</p>' +
        '<p style="opacity: 0; pointer-events: none;">ghost</p>' +
        "</div>"
    );

    expect(clean).not.toContain("position");
    expect(clean).not.toContain("fixed");
    expect(clean).not.toContain("z-index");
    expect(clean).not.toContain("100vw");
    expect(clean).not.toContain("url(");
    expect(clean).not.toContain("opacity");
    expect(clean).not.toContain("pointer-events");
    expect(clean).toContain("track");
    expect(clean).toContain("steal");
    expect(clean).toContain("ghost");
  });

  it("rejects unwanted style properties even inside allowed tags", () => {
    const clean = sanitizeHtml(
      '<p style="display: none; cursor: inherit; font-family: Arial; transform: rotate(180deg); filter: blur(2px);">x</p>'
    );

    expect(clean).toBe("<p>x</p>");
  });
});
