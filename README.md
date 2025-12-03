# fidj-node

> FIDJ node tools - A TypeScript library providing utilities for client authentication, session management, and more.

## 📋 Description

Node.js library that provides a set of tools for FIDJ client authentication, connection management, session
handling, and various utility functions. It's designed to simplify interactions with remote services or APIs.

## 🚀 Installation

```bash
npm install fidj-node
```

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
