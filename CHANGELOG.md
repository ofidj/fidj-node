# Changelog

## [3.6.27] - 2026-09-12

- Replace duplicated raw browser user agents with short session labels such as
  `Chrome on macOS` or `Safari on iPhone`.

## [3.6.26] - 2026-09-12

- Preserve structured API failure statuses through `FidjError`, so generated clients can explain sign-in failures instead of displaying the transport enum `STATUS`.

- Forward explicit agreement choice/version in password login without automatically granting consent.

Dated entries are historical; current workflow is in the package README.

## [3.6.25] - 2026-09-11

- Say plainly that no OpenID Connect provider answered, and that OIDC support is experimental client-side, instead of surfacing a bare fetch failure.
- Add validated OIDC/PKCE client, same-tab facade handoff and live tenant verification; remove the obsolete URL-join dependency and update Axios.
- Read effective roles live, including app groups; fail closed when the session is invalid.
- Add shared-account password recovery and email verification integration.

- Add verifyAppSession for server-side audience/session verification and live membership roles; used by the generated TypeScript starter.
- Align the Mocha test runner with the API for current Node runtimes.
- Preserve DELETE request bodies through the SDK and Axios adapter, including explicit app-departure confirmation.

## [15.1.14] - 2025-12-03

## [1.0.1] - 2026-05-27

### Changed

- **Contract types now come from `@ofidj/contracts`.** Previously, `src/api/` held a hard-copy of the 27 `FidjApi*` interfaces — a violation of single-source-of-truth that risked silent drift between fidj-node and fidj-api. Added `@ofidj/contracts` as a direct dependency; removed `src/api/` entirely; imports updated in `src/index.ts`, `src/sdk/IService.ts`, and `src/sdk/FidjNodeService.ts`.

### Added

- `bpInfo` from `@ofidj/contracts` is now transitively re-exported from `@ofidj/node` (previously not exported). Harmless addition.

## [1.0.0] - 2026-05-27

### Changed

- **Renamed package from `fidj-node` to `@ofidj/node`.** Scope aligns with the `ofidj` GitHub organisation and the `@ofidj/*` package family (`@ofidj/angular`, `@ofidj/contracts`, `@ofidj/generator-fidj`).
- Reset semver to `1.0.0`. Previous range `15.x` (aligned with Angular) is decoupled — this SDK is framework-free and follows independent semver. The HTTP contract version (`/v3` on fidj-api) is unchanged and unrelated to this semver.
- The old `fidj-node` npm package is deprecated and no longer maintained; migrate by replacing `fidj-node` with `@ofidj/node` in `package.json` and updating imports (`from 'fidj-node'` → `from '@ofidj/node'`).

### Added

- **FIDJ-42**: explicit `apiEndpoint?: string` option in `ModuleServiceInitOptionsInterface` for local-dev or custom-API overrides (instead of relying on the implicit `prod:false` fallback).
- **FIDJ-40**: explicit `autoSignup?: boolean` option (default `true` for backward compat) on `login` — set to `false` for strict authentication (unknown user → 401, no auto-creation).
- **FIDJ-40**: HTTP errors from `Client.login` now propagate with their original status code (401 unknown user, 400 bad credentials), instead of being collapsed to a generic 500.

## [15.1.13] - 2025-06-30

### Added

- needsRefresh() and isConnected() methods
- Enhanced error handling for endpoints
- Improved synchronization in sendOnEndpoint

### Changed

- Code linting and formatting improvements
- Updated dependencies to latest versions
- Additional unit tests for improved code quality

## [15.1.12] - 2025-05-25

### Changed

- Updated CI workflow configuration
- Code cleanup and minor improvements
- Added memory bank resources

## [15.1.10] - 2025-04-29

### Added

- Added unit tests (UT) for improved code quality and reliability
- Fixed auto createdUser functionality
- Fixed refreshConnection functionality
- Added endpoint error handling
- Improved synchronization in sendOnEndpoint

## [15.0.0] - 2024-10-15

### Added

- Initial extraction from global package to dedicated node package
