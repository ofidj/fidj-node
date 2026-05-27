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
