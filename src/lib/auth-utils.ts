/**
 * Email addresses are stored and looked up in a canonical form. Postgres
 * unique indexes are case-sensitive, so without this `Ram@Example.com` and
 * `ram@example.com` become two accounts and only one of them can log in.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
