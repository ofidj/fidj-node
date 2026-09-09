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
