export const RESOURCES_PAGE_SIZE = 50;

/** Maximum page number supported before the calculated database offset
 *  exceeds standard 32-bit signed integer limits (2,147,483,647 / 50 ≈ 42,949,672).
 *  Values beyond this or exceeding JavaScript safe integers are rejected early. */
export const MAX_SAFE_RESOURCE_PAGE = Math.floor(2_147_483_647 / RESOURCES_PAGE_SIZE);

/**
 * Validates and parses the requested page parameter.
 * - Missing or empty string defaults to page 1.
 * - Negative, zero, decimal, non-numeric, or malformed strings return null (triggering notFound()).
 * - Values exceeding Number.MAX_SAFE_INTEGER or database offset limits return null (triggering notFound()).
 * - Positive integers within safe bounds return the page number.
 */
export function parseResourcePage(page?: string): number | null {
  if (page === undefined || page === '') {
    return 1;
  }

  // Must be a valid positive integer string with no signs, decimals, or whitespace
  if (!/^[1-9]\d*$/.test(page)) {
    return null;
  }

  const num = Number(page);

  // Must be a safe JavaScript integer
  if (!Number.isSafeInteger(num)) {
    return null;
  }

  // Must be within database OFFSET range
  if (num > MAX_SAFE_RESOURCE_PAGE) {
    return null;
  }

  return num;
}
