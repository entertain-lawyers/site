/**
 * Tracks whether the visitor has made a client-side navigation yet.
 *
 * On the very first (server-rendered) page load we never hide content that is
 * already on screen — it would cost LCP and flash on slow phones. After a
 * client navigation the incoming page is rendered by React anyway, so it can
 * animate in from the start. The flag lives only in the browser; the server
 * never flips it, so server and first client render always agree.
 */
let navigated = false;

export function markClientNavigation() {
  navigated = true;
}

export function hasClientNavigated() {
  return navigated;
}
