/**
 * Shown on the post editors when the server has no WordPress credentials.
 * Saving would fail with an auth error after the admin had typed the whole
 * post, so say so up front; Preview still works because it never writes.
 */
export default function WordPressCredentialsNotice() {
  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <p className="font-bold">Saving to WordPress is not configured on this server.</p>
      <p className="mt-1">
        Posts are stored on WordPress, and this deployment has no credentials to write there. Ask the site
        administrator to add <code>WP_AUTH_USERNAME</code> and <code>WP_AUTH_APP_PASSWORD</code> (a WordPress
        application password) to the hosting environment and redeploy. You can still use Preview.
      </p>
    </div>
  );
}
