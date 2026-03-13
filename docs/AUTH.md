# Authentication — KIT OIDC

SMDT uses KIT's OpenID Connect (Keycloak) for authentication. Any KIT user can log in. Access is tiered into three roles.

## Roles

| Role | Who | Access |
|------|-----|--------|
| **demo** | Any KIT user (default) | Maps and grid overview visible; interactive controls (series, heatmap) disabled |
| **full** | Kürzel listed in `auth.db` | Full access to all features |
| **admin** | Kürzel listed as admin in `auth.db` | Full access + user management at `/admin` |

## How it works

1. User clicks "Sign in with KIT Account" on `/login`
2. Redirected to KIT IdP (`oidc.scc.kit.edu`)
3. After authentication, KIT redirects back to `/api/auth/callback` with an authorization code
4. The callback exchanges the code for tokens, extracts `preferred_username` (= KIT Kürzel like `kg2527`)
5. Looks up the Kürzel in `auth.db` to determine role (default: demo)
6. Creates an HMAC-signed session cookie (8h expiry)

## auth.db

A small SQLite database at `/data/auth.db` (configurable via `AUTH_DB_PATH`).

Single table:
```sql
CREATE TABLE users (
  kuerzel TEXT PRIMARY KEY,
  role    TEXT NOT NULL CHECK(role IN ('full', 'admin'))
);
```

Users **not** in this table get demo access. On first startup, the table is seeded from env vars:
- `AUTH_ADMIN_USERS=cakmak` (comma-separated)
- `AUTH_FULL_USERS=doe,smith` (comma-separated)

After that, admins manage users via the `/admin` page.

## Environment variables

```
AUTH_OIDC_CLIENT_ID=esa-smdt-cloud-iai-kit-edu
AUTH_OIDC_CLIENT_SECRET=<secret>
AUTH_OIDC_ISSUER=https://oidc.scc.kit.edu/auth/realms/kit
AUTH_CALLBACK_URL=https://esa-smdt.cloud.iai.kit.edu/api/auth/callback
AUTH_SECRET=<random-secret-for-session-signing>
AUTH_ADMIN_USERS=cakmak
AUTH_FULL_USERS=
AUTH_DB_PATH=/data/auth.db
```

## OIDC endpoints (derived from issuer)

- Authorize: `{issuer}/protocol/openid-connect/auth`
- Token: `{issuer}/protocol/openid-connect/token`
- Logout: `{issuer}/protocol/openid-connect/logout`
- Scopes: `openid profile email`
- Key claim: `preferred_username` (KIT Kürzel)

## Logout

Logout clears the session cookie and redirects to the KIT OIDC end-session endpoint, which terminates the SSO session.
