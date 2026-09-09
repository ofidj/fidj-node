# @ofidj/node

> FIDJ node tools - A TypeScript library providing utilities for client authentication, session management, and more.
>
> _Renamed from `fidj-node` at 1.0.0. The old `fidj-node` package is deprecated; install `@ofidj/node`._

## 📋 Description

Node.js library that provides a set of tools for FIDJ client authentication, connection management, session
handling, and various utility functions. It's designed to simplify interactions with remote services or APIs.

## 🚀 Quick Start (5 minutes)

```bash
npm install @ofidj/node
```

```typescript
import {FidjNodeService} from '@ofidj/node';

const fidj = new FidjNodeService();

// Zero-config: connects to sandbox automatically
await fidj.init();

// Or with your app ID for production
// await fidj.init('your-fidj-app-id', {prod: true});

await fidj.login('user@example.com', 'password');
const token = await fidj.fidjGetIdToken();
```

**Where to find your fidjId?** Log in to [fidj.ovh](https://fidj.ovh), go to your app settings, and copy the App ID.

See the full [Quickstart Guide](./QUICKSTART.md) for more examples (demo mode, browser usage, API calls, troubleshooting).

## 🧩 Modules

The library consists of several modules:

- **connection**: Provides classes and interfaces for client authentication and connection management
- **sdk**: Software development kit for interacting with services
- **session**: Handles user sessions
- **tools**: Utility functions for Base64 encoding/decoding, storage operations, and XOR operations

## 📚 Documentation

Please read the [specifications](./specs) for detailed information about each module:

- [connection](./specs/connection): Client authentication and connection management
- [sdk](./specs/sdk): SDK for service interaction
- [session](./specs/session): Session handling
- [tools](./specs/tools): Utility functions
- [scenarios](./specs/01.scenario): Usage scenarios and examples

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test-coverage
```

## 📝 History

See [Changelog](./CHANGELOG.md).

## 📄 License

MIT

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

## Integrated OIDC beta

Use Node 22 LTS or later. `FidjOidcClient` uses `oauth4webapi` for protocol validation; the configured issuer and REST API must share an origin. Register the exact callback with the app owner console first.

```typescript
import {FidjOidcClient} from '@ofidj/node';
const identity = new FidjOidcClient({
    issuer: 'https://api.sandbox.fidj.ovh/oidc',
    clientId: 'YOUR_APP_ID',
    redirectUri: window.location.origin + window.location.pathname,
    apiEndpoint: 'https://api.sandbox.fidj.ovh/v3',
    storage: sessionStorage,
});
// On the sign-in action:
window.location.assign(await identity.beginLogin());
// On the registered callback, before opening application content:
await identity.completeLogin(new URL(window.location.href));
const accessToken = await identity.accessToken();
```

These are two lifecycle steps, not consecutive actions on one page load. Remove callback query parameters from browser history after capturing the callback. Transactions expire after ten minutes and are consumed once. The client validates issuer, state, nonce and ID-token signatures. Refresh calls are serialized within one client instance; expired/replayed sessions require login again. `logout()` revokes the app grant and clears local session storage.

The generated same-origin module and `FidjNodeService` facade recognize this same-tab session. The facade retains its historical API token-getter name for existing consumers; use `accessToken()` for new OIDC API integrations. The standalone ID token is identity evidence, not a REST bearer credential. A production backend-for-frontend with HttpOnly cookies remains a separate integration choice for confidential applications.

Backend tenant authorization:

```typescript
import {verifyOrganizationSession} from '@ofidj/node';
const access = await verifyOrganizationSession(bearerToken, {
    appId: process.env.FIDJ_APP_ID!,
    apiEndpoint: process.env.FIDJ_API_ENDPOINT!,
    organizationId,
    permission: 'projects:write',
});
// Scope the application database query to access.organizationId as well.
```

`verifyAppSession` now supports live opaque OIDC access tokens and validates the authoritative app/subject response. An app-wide role does not grant organization access. The integrated API tests exercise the shipped OIDC client, backend verifier and facade. Hosted issuer activation, independent conformance and stable package publication remain release gates.
