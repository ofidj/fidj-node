# @ofidj/node

JS/TypeScript SDK for Fidj authentication, sessions, app roles and privacy. Install `@ofidj/node`; the old `fidj-node` package name is deprecated.

Start with [QUICKSTART.md](QUICKSTART.md). Modules live under `src/connection`, `src/sdk`, `src/session` and `src/tools`; shared API types come from `@ofidj/contracts`.

## Development

Read the [workspace rules](../AGENTS.md). Follow red → green → refactor: run a new failing behavior test before implementation, make it pass, then run relevant regression checks.

```sh
npm run build
npm test
npm run test-coverage
```

See [CHANGELOG.md](CHANGELOG.md) for history. License: MIT. Development features require coordinated API/contracts versions; local success does not imply package publication.

## Server-side app sessions

The 3.6.24 development version exports `verifyAppSession` for a Node backend:

```typescript
import {verifyAppSession} from '@ofidj/node';

const session = await verifyAppSession(bearerToken, {
    appId: process.env.FIDJ_APP_ID!,
    apiEndpoint: process.env.FIDJ_API_ENDPOINT!,
});
if (!session.roles.includes('Editor') && !session.roles.includes('Owner')) {
    // Respond with 403 before executing the protected operation.
}
```

Call it on every protected operation. It rejects tokens for another app, delegates signature and stored-session validation to the configured Fidj API, and returns current membership roles rather than cached JWT role claims. It fails closed on timeouts or invalid upstream responses. Keep the endpoint configuration server-controlled and use HTTPS outside loopback development. No app signing key is required in the consumer backend.

The generated TypeScript starter and the mleweb example exercise this flow. This helper requires a runtime with `fetch` and `AbortSignal.timeout`; the examples and CI target Node 22/24.

## Account recovery and verification

After `init`, call `fidjForgotPasswordRequest(email)` for a neutral reset request, `resetPassword({token, password})` to consume a link, or `verifyEmail({token})` for explicit confirmation. These three methods work without an authenticated session. `resendVerification()` requires a signed-in session; `getMe()` returns `data.user.verified`. A reset changes the shared identity password and revokes existing sessions across apps.

Requires the coordinated 3.6.24 API and contracts changes. Passwords must contain at least 12 characters and no more than 72 UTF-8 bytes. Email links point to the API’s configured account UI.


`fidjRoles()` also reads effective roles from the API for signed-in sessions, including app-group grants and removals. It can now reject when the session or API is unavailable; handle that error instead of relying on cached access. Demo mode keeps its local behavior. `verifyAppSession` remains the check to use on protected backend operations; client UI checks alone do not authorize a request.

Authenticated `PUT /me` password changes require `{currentPassword, password}`. They apply the same password limits as reset, revoke existing sessions, and invalidate outstanding reset links. Sign in again after success. Name-only updates do not change credentials.

## Beta identity helpers

The source exports `FidjOidcClient` and tenant-verification helpers. The API ships an integrated `/oidc` provider from 3.6.26, in beta: it serves no `/oidc` routes at all unless the operator sets `FIDJ_OIDC_ISSUER` and its signing keys, so an issuer URL is something a deployment has to configure rather than something to assume. Organization routes are beta on the same release.

OIDC client support includes state/nonce/signature validation and same-tab session handoff. These client capabilities do not by themselves establish conformance or hosted readiness: verify the issuer answers discovery, and validate the integration against the deployment you are targeting, before offering it to app builders.

## Explicit app agreement on login

Fetch `GET /apps/:appId` and show `app.agreement.text` beside an unchecked required
checkbox. Pass the person's choice and the displayed version to
`login(email, password, {termsAccepted: checkbox.checked, termsVersion: agreement.version})`.
Never set acceptance automatically. Missing/false acceptance or an outdated
version returns HTTP 409 before the app token is issued. Password login requires
this choice every time; an accepted unchanged version creates no duplicate audit
entry. Renewals use the already recorded current agreement. A new version requires
sign-in again. Optional consent remains independent. Coordinated API/SDK versions
are required; legacy login callers must supply the new options.
