# Requisite authentication setup

## Existing intranet URL-parameter login

The existing `POST /api/auth/login` flow is unchanged. It accepts the employee
ID and bypass value supplied by the intranet, retrieves the staff record using
the existing intranet API, and retains the current database fallback behavior.

## Email and password login

`POST /api/auth/email-login` authenticates email and password with the intranet,
then creates or synchronizes the Requisite user from the returned staff profile
on every successful login. Requisite stores a bcrypt hash of the successfully
authenticated password so an already-provisioned user can sign in if the
intranet later becomes unavailable. The plaintext password is never stored.
When the intranet is unavailable, fallback is permitted only for a local user
with a matching stored password hash. A first-time user receives a structured
`503` error instead of being silently provisioned from stale local data.

The browser request to `/api/auth/email-login` contains only the email and
password. Requisite makes a separate server-to-server POST to the intranet and
adds the `X-Requisite-Timestamp`, `X-Requisite-Nonce`, and
`X-Requisite-Signature` headers there. These headers will not appear in the
browser's Network panel for the `/api/auth/email-login` request. With
`INTRANET_AUTH_DEBUG=full`, inspect the backend process logs for the upstream
request details. The backend will not send that request unless
`INTRANET_BYPASS` is set. For this intranet integration, the shared secret is
the literal value `iGNOre`.

The response keeps the existing frontend success shape (`token` and `user`).
Authentication errors include stable `code` and `detail` fields:

```json
{
  "success": false,
  "code": "INTRANET_UNAVAILABLE_NO_LOCAL_ACCOUNT",
  "detail": "The intranet is unavailable and this account has not logged in to Requisite before",
  "message": "The intranet is unavailable and this account has not logged in to Requisite before"
}
```

The frontend should branch on `code` rather than parsing `message`. Codes
include `INVALID_CREDENTIALS`, `INTRANET_ACCOUNT_NOT_FOUND`,
`ACCOUNT_INACTIVE`, `INTRANET_PROFILE_INVALID`, and
`INTRANET_UNAVAILABLE_NO_LOCAL_ACCOUNT`. If the shared signing secret is
missing, the API returns `INTRANET_AUTH_NOT_CONFIGURED` instead of treating a
configuration problem as an offline login attempt.

## Google sign-in

The OAuth flow is:

1. The browser navigates to `GET /api/auth/google`.
   The frontend opens the endpoint in a popup and passes its exact origin as
   `frontendOrigin`. Requisite accepts only origins listed in
   `GOOGLE_AUTH_FRONTEND_ORIGINS`.
2. Requisite redirects to Google using the OpenID Connect `openid email profile`
   scopes and a signed, short-lived `state` plus an OIDC `nonce`.
3. Google redirects to `GET /api/auth/google/callback`.
4. Requisite exchanges the authorization code, verifies Google's ID token,
   audience, issuer, expiry, nonce, and verified email, then calls the intranet
   email lookup contract below and synchronizes the profile on every successful
   login.
5. Requisite synchronizes the returned intranet profile into its local database
   and returns the same `{ success, data: { user, token }, message }` shape as
   the existing staff login.

If the intranet is unavailable, Google sign-in can use an already-provisioned,
active local user whose email exactly matches Google's verified email. A
first-time user receives `INTRANET_UNAVAILABLE_NO_LOCAL_ACCOUNT`. If the
intranet explicitly reports that the account does not exist or is inactive,
the local fallback is not used.

### Google Cloud Console setup

Set the `GOOGLE_REDIRECT_URI` environment variable to the exact public HTTPS
callback URL:

```text
https://daystarrequisite.onrender.com/api/auth/google/callback
```

Register that exact value as an **Authorized redirect URI** for a Google OAuth
Web application client. Configure the issued values on the backend only:

```text
GOOGLE_CLIENT_ID=1010194924914-7vkksqv9mlm166n9s9if2ircidbh1t4d.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client secret from the provided OAuth JSON>
GOOGLE_REDIRECT_URI=https://daystarrequisite.onrender.com/api/auth/google/callback
JWT_SECRET=<existing jwt signing secret>
```

The client secret must never be sent to the frontend or committed to source
control. The Google start and callback endpoints are public endpoints; the
callback uses signed OAuth state and verifies the returned identity.

For the production frontend popup handoff, configure this exact-origin
allowlist on the backend:

```text
GOOGLE_AUTH_FRONTEND_ORIGINS=https://requisite.vercel.app
```

Add `http://localhost:3004` or `http://127.0.0.1:3004` to the comma-separated
allowlist only when local development needs to use the production backend. In
non-production mode these origins are accepted automatically.

After successful callback authentication, the backend posts the existing
`{ success, data: { user, token } }` payload to the opener using that exact
allowlisted origin and closes the popup. It does not place the JWT in a URL.

### Intranet email lookup contract (to implement)

The intranet is the authoritative source for first-time users. The current
employee-ID lookup cannot resolve a Google email, so the intranet developer
should add an endpoint that maps an exact email address to one staff profile,
including its active/inactive status. Requisite calls the configured
`INTRANET_EMAIL_LOOKUP_URL` using
`POST`, a 10-second timeout, and the following headers:

```http
X-Requisite-Timestamp: <unix timestamp in seconds>
X-Requisite-Nonce: <random 32-character hex string>
X-Requisite-Signature: v1=<lowercase HMAC-SHA256 hex digest>
Content-Type: application/json
```

The signature uses the existing `INTRANET_BYPASS` secret configured on both
systems. Requisite signs each exact JSON request body using this canonical
UTF-8 string:

```text
v1
<unix timestamp in seconds>
<random 32-character hex nonce>
POST
<URL pathname and query string>
<exact request body bytes>
```

The intranet must compute `HMAC-SHA256(INTRANET_BYPASS, canonicalString)`,
compare the lowercase hex digest in constant time, and reject timestamps more
than five minutes from its clock. It must also reject previously used nonces
within that five-minute window. This is a per-request signature; Requisite does
not send a static bearer token. The same signing scheme is used for both the
profile lookup and email/password authentication endpoints. The configured
intranet URLs must use HTTPS (loopback HTTP is allowed for development).
Set `INTRANET_BYPASS` in the backend environment to the shared secret
configured by the intranet developer. For the current intranet integration,
that exact shared value is `iGNOre`.

The intranet-provided lookup URL is
`https://daystarng.org/intranet2/api/email_lookup`. Its configured default is
`INTRANET_EMAIL_LOOKUP_URL`; the auth URL is
`https://daystarng.org/intranet2/api/email_auth`, configurable as
`INTRANET_EMAIL_AUTH_URL`.

Request:

```json
{
  "email": "staff@daystarng.org"
}
```

Successful response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "user_id": "47",
    "first_name": "Ada",
    "last_name": "Staff",
    "email": "staff@daystarng.org",
    "dept_id": "12",
    "dept_name": "Finance",
    "designation_id": "5",
    "designation": "Accountant",
    "is_active": true
  }
}
```

All fields in `data` are required. `email` must be the staff member's canonical
email, and `is_active` must be a JSON boolean. Requisite compares the returned
email to Google's verified email before accepting the profile.

Suggested non-success responses:

- `404 Not Found`: no staff account has that email.
- `401 Unauthorized`: invalid request signature, stale timestamp, or reused nonce.
- `409 Conflict`: the email matches multiple staff accounts.
- `5xx`: intranet lookup unavailable.

The lookup must not return passwords or other authentication secrets. It should
perform an exact, case-insensitive email lookup, return only active/inactive
status and the staff fields above, and be available to Requisite over HTTPS.
Configure the URL and existing shared bypass secret only in the backend
environment:

```text
INTRANET_EMAIL_LOOKUP_URL=https://<intranet-host>/<lookup-route>
INTRANET_BYPASS=<same private secret configured on the intranet>
```

### Intranet email/password authentication contract (to implement)

Email/password sign-in also needs the intranet to validate the submitted
credentials. Requisite calls the configured `INTRANET_EMAIL_AUTH_URL` using
`POST`, a 10-second timeout, and the same dynamic HMAC signature described
above:

```json
{
  "email": "staff@daystarng.org",
  "password": "<password supplied by the user>"
}
```

On valid credentials, return the same `200` profile envelope and required staff
fields documented above. Suggested non-success responses:

- `401 Unauthorized`: `error: "invalid_credentials"` for a wrong password, or
  `error: "invalid_signature"` for an invalid signature.
- `403 Forbidden`: staff account is inactive. Include the same staff profile
  envelope in `data` with `"is_active": false` so Requisite can immediately
  synchronize the inactive status before denying login.
- `404 Not Found`: no staff account matches the email.
- `409 Conflict`: email matches multiple staff accounts.
- `5xx`: authentication service unavailable.

The endpoint must validate the password against the intranet's credential
store, never return or log the password, and only return the profile after
successful authentication. Require HTTPS between Requisite and the intranet.
Requisite stores only a bcrypt hash of the password after successful online
authentication to enable offline fallback for that returning user.

For temporary diagnostics, set `INTRANET_AUTH_DEBUG=full` in the backend
environment. The backend then logs the outgoing request method, URL, headers,
and body, plus the response status, headers, and body (including non-2xx
responses) for email-auth and email-lookup calls. This includes the submitted
password and request signature; the response may contain staff details. Turn
the setting off immediately after troubleshooting and never enable it in
production.

The `INTRANET_EMAIL_AUTH_URL` and `INTRANET_EMAIL_LOOKUP_URL` values may point
to two actions on the same intranet route if that route supports both request
shapes, or to separate routes. The authentication action must never trust an
email lookup alone as proof of password ownership.

## API documentation

The endpoints are documented in Swagger at `/api-docs`. The existing URL
parameter staff login remains available at `POST /api/auth/login`.
