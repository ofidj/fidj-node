# SDK quickstart

Install `@ofidj/node` in your app. For coordinated unpublished changes, use the built workspace SDK; see the [local walkthrough](../LOCAL-DEVELOPMENT.md).

```sh
npm install @ofidj/node
```

## Local login

Start the workspace stack first. Run this JavaScript in your application (CommonJS), using the seeded local account:

```javascript
const {FidjNodeService} = require('@ofidj/node');
const {createInterface} = require('node:readline/promises');

async function main() {
    const fidj = new FidjNodeService();
    await fidj.init('fidj-local-studio', {
        prod: false,
        apiEndpoint: 'http://localhost:3201/v3',
    });
    const response = await fetch('http://localhost:3201/v3/apps/fidj-local-studio');
    const {app} = await response.json();
    console.log(app.agreement.text);
    const prompt = createInterface({input: process.stdin, output: process.stdout});
    const answer = await prompt.question(`Accept version ${app.agreement.version}? Type yes: `);
    prompt.close();
    if (answer !== 'yes') return;
    await fidj.login('maya@fidj.local', 'local-member-only', {
        termsAccepted: true,
        termsVersion: app.agreement.version,
    });
    console.log('Roles:', await fidj.fidjRoles());
    await fidj.logout(true);
}
main().catch(console.error);
```

TypeScript/browser bundles import `FidjNodeService` from `@ofidj/node`. Browser apps need an allowed origin and their own public app ID. Never include an app private key in browser code.

## Environments

| Target | Initialization |
| --- | --- |
| Local | Explicit local app ID and `apiEndpoint` as above |
| Hosted sandbox | `init()` or an explicit sandbox ID with `{prod: false}` |
| Production | `init('YOUR_APP_ID', {prod: true})` |
| Offline UI demo | `initDemo()`; mock sessions provide no server authorization |

Obtain production IDs from the Fidj owner console. Hosted examples require a configured app/account; do not assume arbitrary credentials work. SDK auto-signup and the generated UI's strict sign-in are separate choices. New passwords require at least 12 characters and at most 72 UTF-8 bytes.

## Common operations

```typescript
const roles = await fidj.fidjRoles(); // Current API roles; handle failures.
await fidj.sync({forceRefresh: true});
const token = await fidj.fidjGetIdToken();
const response = await fidj.sendOnEndpoint({
    verb: 'GET',
    key: 'apps',
    relativePath: `${appId}/details`,
});
```

Owner details require owner authorization. Client role checks only control UI; use `verifyAppSession` for protected backend operations. Recovery, verification and experimental identity helpers are described in the [SDK README](README.md).

## Troubleshooting

- Initialize before login; pass a valid app ID when supplying options.
- Check API `/v3/status`, endpoint, app ID, allowed origin and SDK/API compatibility.
- Handle login errors explicitly; do not read user fields after a failed call.
- Local accounts and app IDs created manually disappear when the API restarts.

For SDK changes, follow the [TDD workflow](../AGENTS.md#tdd-red--green--refactor).
