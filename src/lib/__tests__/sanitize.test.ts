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

  it("rejects fully transparent text colours", () => {
    const clean = sanitizeHtml(
      '<p style="color: transparent;">a</p>' +
        '<p style="color: #0000;">b</p>' +
        '<p style="color: #00000000;">c</p>' +
        '<p style="color: rgba(0, 0, 0, 0);">d</p>' +
        '<p style="color: rgba(0, 0, 0, 0.0);">e</p>' +
        '<p style="color: rgba(0, 0, 0, 0.4);">f</p>'
    );

    expect(clean).not.toContain("transparent");
    expect(clean).not.toContain("#0000");
    expect(clean).not.toContain("rgba(0, 0, 0, 0)");
    // A visible alpha value is still ordinary formatting.
    expect(clean).toContain("rgba(0, 0, 0, 0.4)");
  });

  it("bounds font sizes and margins", () => {
    const clean = sanitizeHtml(
      '<p style="font-size: 900px; margin-top: 5000px; margin-bottom: -900px;">a</p>' +
        '<p style="font-size: 17px; margin-top: 0px; margin-bottom: 10px;">b</p>'
    );

    expect(clean).not.toContain("900px");
    expect(clean).not.toContain("5000px");
    expect(clean).not.toContain("-900px");
    expect(clean).toContain("font-size:17px");
    expect(clean).toContain("margin-top:0px");
    expect(clean).toContain("margin-bottom:10px");
  });
});

describe("sanitizeHtml editor output (regression)", () => {
  it("keeps video embeds from the editor's video button for YouTube and Vimeo over https", () => {
    const youtube =
      '<iframe class="ql-video el-ed" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/dQw4w9WgXcQ?showinfo=0"></iframe>';
    expect(sanitizeHtml(youtube)).toBe(youtube);
    expect(sanitizeHtml('<iframe src="https://player.vimeo.com/video/1"></iframe>')).toBe(
      '<iframe src="https://player.vimeo.com/video/1"></iframe>'
    );
  });

  it("removes iframes from other hosts, other protocols and relative URLs entirely", () => {
    for (const src of ["https://evil.example/x", "javascript:alert(1)", "//www.youtube.com/embed/x", "http://www.youtube.com/embed/x", "/local"]) {
      expect(sanitizeHtml(`<p>a</p><iframe src="${src}"></iframe>`)).toBe("<p>a</p>");
    }
  });

  it("strips srcdoc and event handlers from allowed iframes", () => {
    expect(
      sanitizeHtml('<iframe srcdoc="<script>alert(1)</script>" onload="alert(1)" src="https://www.youtube.com/embed/x"></iframe>')
    ).toBe('<iframe src="https://www.youtube.com/embed/x"></iframe>');
  });

  it("keeps the editor's highlight colour but not invisible or url() backgrounds", () => {
    expect(sanitizeHtml('<span style="background-color: rgb(255, 255, 0)">h</span>')).toBe(
      '<span style="background-color:rgb(255, 255, 0)">h</span>'
    );
    expect(sanitizeHtml('<span style="background-color: transparent">h</span>')).toBe("<span>h</span>");
    expect(sanitizeHtml('<span style="background-color: url(https://evil.example/x.png)">h</span>')).toBe("<span>h</span>");
  });

  it("keeps the editor's layout markers and resized, aligned images", () => {
    const html = '<p class="ql-align-center el-ed el-tight"><img src="https://www.entertainlawyers.com/a.jpg" width="278" /></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("keeps image wrapping classes and width, but drops unsafe inline styles", () => {
    const clean = sanitizeHtml(
      '<p class="el-wrap-left"><img src="https://www.entertainlawyers.com/a.jpg" width="300" style="float:left;position:fixed"></p>' +
        '<p><img class="alignright" src="https://www.entertainlawyers.com/b.jpg"></p>'
    );

    expect(clean).toContain('class="el-wrap-left"');
    expect(clean).toContain('width="300"');
    // Older WordPress classes survive, so published posts keep floating.
    expect(clean).not.toContain("style=");
    expect(clean).not.toContain("position");
  });

  it("keeps valid, bounded line-height styles on block elements and list items", () => {
    const valid =
      '<p style="line-height: 1.0;">single</p>' +
      '<h2 style="line-height: 1.15;">h2</h2>' +
      '<blockquote style="line-height: 1.5;">quote</blockquote>' +
      '<ul><li style="line-height: 1.75;">item</li><li style="line-height: 2.0;">double</li></ul>' +
      '<p style="line-height: normal;">normal</p>' +
      '<p style="line-height: 150%;">percent</p>' +
      '<p style="line-height: 1.5rem;">rem</p>';

    const clean = sanitizeHtml(valid);
    expect(clean).toContain('style="line-height:1.0"');
    expect(clean).toContain('style="line-height:1.15"');
    expect(clean).toContain('style="line-height:1.5"');
    expect(clean).toContain('style="line-height:1.75"');
    expect(clean).toContain('style="line-height:2.0"');
    expect(clean).toContain('style="line-height:normal"');
    expect(clean).toContain('style="line-height:150%"');
    expect(clean).toContain('style="line-height:1.5rem"');
  });

  it("rejects unsafe or out-of-bounds line-height values", () => {
    const dangerous =
      '<p style="line-height: url(javascript:alert(1));">bad url</p>' +
      '<p style="line-height: 100;">extreme</p>' +
      '<p style="line-height: 0;">zero collapse</p>' +
      '<p style="line-height: -1;">negative</p>' +
      '<p style="line-height: 500px;">huge px</p>';

    const clean = sanitizeHtml(dangerous);
    expect(clean).not.toContain('line-height');
  });
});
