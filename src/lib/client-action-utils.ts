/**
 * Utility functions for handling Server Action errors and version skew on the client.
 */

/**
 * Detects if an error was caused by a stale deployment or Server Action ID mismatch.
 * In Next.js App Router, when a new build is deployed or a client holds an outdated bundle,
 * calling a Server Action will throw an UnrecognizedActionError:
 * `Server Action "<id>" was not found on the server.`
 * or `Failed to find Server Action "<id>". This request might be from an older or newer deployment.`
 */
export function isServerActionNotFoundError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === 'string' ? error : (error as Error).message || '';
  return (
    message.includes('was not found on the server') ||
    message.includes('Failed to find Server Action') ||
    message.includes('Server Reference ID did not match')
  );
}

export const STALE_ACTION_ERROR_MESSAGE =
  'The application was updated since this page was opened. Please reload the page to submit your changes.';

/**
 * Returns a user-friendly error message for form submissions, masking internal
 * Server Action skew/hash errors with a clear reload suggestion.
 */
export function getActionErrorMessage(error: unknown, fallback = 'Failed to submit form'): string {
  if (isServerActionNotFoundError(error)) {
    return STALE_ACTION_ERROR_MESSAGE;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return fallback;
}
