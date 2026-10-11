# Admin Provisioning

Use `scripts/provision-admin.mjs` to create the first administrator account safely.

## Required environment variables

- `DATABASE_URL` — target PostgreSQL database.
- `ADMIN_EMAIL` — the email address to provision as the administrator.
- `ADMIN_PROVISION_TARGET` — optional label such as `development`, `staging`, or `production` for clearer confirmations.
- `ADMIN_NAME` — optional display name.

The script also loads `.env` locally if present, but never prints secrets.

## Safe usage

```bash
ADMIN_EMAIL="admin@example.com" ADMIN_PROVISION_TARGET="staging" node scripts/provision-admin.mjs
```

The initial password is requested through a hidden interactive prompt. Do not pass passwords as command-line arguments or store them in shell history.

Before writing, the script displays only non-secret target details: environment label, database host, database name, and admin email. It then requires an exact typed confirmation.

## Safety behavior

- If an ADMIN user with the same email already exists, no write occurs.
- If a non-admin user with the same email exists, the script fails and refuses to promote or modify that user silently.
- It does not reset passwords for existing users.
- It hashes new passwords with `bcryptjs` cost factor `12`, matching the existing authentication implementation.
- It marks the new admin account as email-verified so credentials login can reach `/admin`.

Do not run this against Neon/staging/production until the target and operation are explicitly approved.
