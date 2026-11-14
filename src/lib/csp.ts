import { storageOriginForCsp } from "./storage-origin";
import { headers } from "next/headers";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Hand-authored inline scripts must carry the same nonce the proxy generated
 * for this request. Framework scripts pick it up automatically from the CSP
 * request header; author scripts read it here instead.
 */
export async function getScriptNonce(): Promise<string | undefined> {
  try {
    const headerList = await headers();
    return headerList.get("x-nonce") ?? undefined;
  } catch {
    // Outside a request scope (unit tests, static prerender passes): render
    // inline scripts without a nonce rather than crashing the page.
    return undefined;
  }
}

/**
 * Single source of truth for the production Content-Security-Policy.
 *
 * Applied per-request in src/proxy.ts with a generated nonce:
 * framework scripts pick the nonce up from the forwarded request headers and
 * hand-authored inline scripts (layout theme init, JSON-LD blocks) receive it
 * explicitly. style-src keeps 'unsafe-inline' because Quill and the theme
 * system inject style attributes/elements at runtime; removing it would break
 * real functionality for little gain.
 *
 * This replaces the static header in next.config.ts: duplicated CSP headers
 * would be enforced as a conjunction, re-allowing unsafe-inline and defeating
 * the nonce entirely.
 *
 * `upgrade-insecure-requests` is production-only: on http://localhost it makes
 * Chromium rewrite same-origin requests to https://localhost, which no local
 * dev server listens on (form posts and navigations fail with SSL errors).
 */
export function buildCsp(nonce?: string): string {
  const b2Origin = storageOriginForCsp(process.env.B2_ENDPOINT, isDev);
  const b2OriginPart = b2Origin ? ` ${b2Origin}` : "";
  const scriptSrc = [
    "'self'",
    "https://va.vercel-scripts.com",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...(nonce ? [`'nonce-${nonce}'`] : []),
  ].join(" ");

  const imgSrc = [
      "'self'",
      "blob:",
      "data:",
      "https://entertainlawyers.com",
      "https://www.entertainlawyers.com",
      "https://secure.gravatar.com",
      "https://cms.entertainlawyers.com",
      b2OriginPart,
    ].filter(Boolean).join(" ");

    const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSrc}`,
    `font-src 'self'`,
    `connect-src 'self'${b2OriginPart} https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
    `worker-src 'self' blob:`,
    // 'self' lets the act reader modal embed our same-origin PDF proxy.
    `frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://epay.esewa.com.np https://rc-epay.esewa.com.np`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ];

  return directives.join("; ") + ";";
}
