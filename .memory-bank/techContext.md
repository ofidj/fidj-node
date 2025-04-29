# fidj-node Technical Context

## Technologies Used

### Core Technologies
- **TypeScript**: The library is written in TypeScript for type safety and better developer experience
- **Node.js**: The runtime environment for the library
- **npm**: Package manager for dependencies and distribution

### Dependencies
- **axios** (^1.8.4): HTTP client for making requests to remote services
- **base-64** (^1.0.0): Utility for Base64 encoding and decoding
- **proper-url-join** (^2.1.2): Utility for joining URL parts correctly

### Development Dependencies
- **@types/chai** (^4.3.10): TypeScript definitions for Chai
- **@types/chai-spies** (^1.0.6): TypeScript definitions for Chai spies
- **@types/mocha** (^10.0.9): TypeScript definitions for Mocha
- **@types/node** (^20.17.9): TypeScript definitions for Node.js
- **chai** (^4.3.10): Assertion library for testing
- **chai-spies** (^1.1.0): Spying capabilities for Chai
- **mocha** (^10.2.0): Test framework
- **nyc** (^15.1.0): Code coverage tool
- **ts-node** (^10.9.2): TypeScript execution environment for Node.js
- **tslint** (^6.1.3): Linting tool for TypeScript
- **typescript** (^5.6.3): TypeScript compiler

## Development Setup

### Build Process
The build process is managed through npm scripts:
- `npm run build`: Builds the distribution package
- `npm run build-version`: Updates the version number and generates a version file
- `npm run build-dist`: Cleans the dist directory and compiles TypeScript to JavaScript

### Testing
Testing is done using Mocha and Chai:
- `npm test`: Runs the test suite
- `npm run test-coverage`: Runs tests with coverage reporting

### Continuous Integration
CI/CD is handled through GitHub Actions:
- Automated testing on push to main branch
- Automated build and publish to npm registry

## Technical Constraints

### Node.js Compatibility
The library is designed to work with Node.js environments. It may not be suitable for browser environments without additional bundling and polyfills.

### TypeScript Version
The library requires TypeScript 5.6.3 or later for development.

### API Limitations
- The library is designed for RESTful API interactions
- WebSocket or GraphQL APIs may require additional adapters

### Security Considerations
- Token storage should be handled securely by the consuming application
- The library provides basic XOR operations but not full encryption
- Sensitive data should be handled with appropriate security measures

## Dependencies Management

### Versioning Strategy
- Dependencies use caret versioning (^) to allow compatible updates
- Major version updates of dependencies require careful testing

### Update Process
- Dependencies are updated regularly to address security vulnerabilities
- Breaking changes in dependencies are handled in major version updates of the library

## Distribution

### Package Format
The library is distributed as an npm package containing:
- Compiled JavaScript files
- TypeScript declaration files
- README and license files

### Versioning
The library follows semantic versioning:
- Major version: Breaking changes
- Minor version: New features without breaking changes
- Patch version: Bug fixes and minor improvements
