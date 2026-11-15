/**
 * Email addresses are stored and looked up in a canonical form. Postgres
 * unique indexes are case-sensitive, so without this `Ram@Example.com` and
 * `ram@example.com` become two accounts and only one of them can log in.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Shared by the forgot-password server action and its client UI, which must match exactly. */
export const NO_ACCOUNT_MESSAGE = "No account found with this email address.";
