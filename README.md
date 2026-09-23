# @ofidj/node

JS/TypeScript SDK for Fidj authentication, sessions, app roles and privacy. Install `@ofidj/node`; the old `fidj-node` package name is deprecated.

Start with [QUICKSTART.md](QUICKSTART.md). Modules live under `src/connection`, `src/sdk`, `src/session` and `src/tools`; shared API types come from `@ofidj/contracts`.

## Development

Read the [workspace rules](../fidj-brain/AGENTS.md). Follow red → green → refactor: run a new failing behavior test before implementation, make it pass, then run relevant regression checks.

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

`beginLogin()` sends no `prompt`, so a person who already has a session with the
provider is signed in without typing anything again, and an app they have already
approved needs no second approval. Two options change that, and both are opt-in
while this support is beta:

- `beginLogin({silent: true})` asks for an answer without a screen. When nobody is
  signed in, the callback carries an error instead of a code; `completeLogin`
  throws it with `error.code` set to `login_required` or `consent_required` and
  `error.silentRefusal === true`, which is the signal to start an ordinary
  sign-in. Run it from a person's click, never on page load: a silent request
  made on every visit tells the provider which sites they open.
- `beginLogin({prompt: 'login'})` forces a fresh credential check, for an app
  that wants one before a sensitive action.

## Explicit app agreement on login

Call `login(email, password)` first. When the account owes this app its
agreement, the call fails with HTTP 409 `agreement_required` and the answer
carries `agreement: {version, text}` — show that on a screen of its own, with an
unchecked required box and a read-only submit, then call
`login(email, password, {termsAccepted: true, termsVersion: agreement.version})`.
`GET /apps/:appId` returns the same agreement for a page that wants to render it
before asking. Do not put the checkbox beside the password: the 409 is what says
whether the question is owed at all, and an owner publishing a new version is
what makes it owed again.
[The workspace README](../fidj-brain/README.md#entry-one-flow-the-same-everywhere) gives
the whole flow, including the verification wait on the account-creation path.
Never set acceptance automatically.

**Creating an account does not sign anybody in.** `login` reads the status of
`POST /v3/users`: 201 means the account was created by this very call, so it
stops there and rejects with reason `verification-required` and the address in
`details`, having asked for no token. 202 means the account was already there
and the password matched, which signs in as before. Nothing else distinguishes
the two, and no policy is consulted, so no existing account is affected. The API
then refuses every app token until the address is verified. Missing/false acceptance or an outdated
version returns HTTP 409 before the app token is issued. Password login requires
this choice every time; an accepted unchanged version creates no duplicate audit
entry. Renewals use the already recorded current agreement. A new version requires
sign-in again. Optional consent remains independent. Coordinated API/SDK versions
are required; legacy login callers must supply the new options.
