/**
 * CLI shim for `next/cache`.
 *
 * `src/lib/wordpress.ts` imports `revalidateTag` for the Next runtime. The
 * standalone index builder runs in plain Node, where Next's cache module
 * cannot resolve — and revalidation is irrelevant for a one-off ingestion.
 */
export function revalidateTag(): void {
  // no-op outside Next
}

export function revalidatePath(): void {
  // no-op outside Next
}

export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
