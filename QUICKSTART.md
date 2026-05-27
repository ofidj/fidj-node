# Quickstart `@ofidj/node`

From `npm install` to your first login in under 15 minutes.

## 1. Install

```bash
mkdir my-fidj-app && cd my-fidj-app
npm init -y
npm install @ofidj/node
```

**TypeScript (recommended):**

```bash
npm install -D typescript ts-node @types/node
npx tsc --init
```

## 2. Init + Login

### Node.js (TypeScript)

Create `quickstart.ts`:

```typescript
import {FidjNodeService} from '@ofidj/node';

async function main() {
    const fidj = new FidjNodeService();

    // Init on sandbox (zero-config)
    await fidj.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
    console.log('Connected to sandbox');

    // Login (auto-creates user on sandbox)
    const user = await fidj.login('quickstart@fidj.ovh', 'test');
    console.log('Logged in as:', user.username);
    console.log('Roles:', user.roles);

    // Get your ID token (JWT)
    const idToken = await fidj.fidjGetIdToken();
    console.log('ID token:', idToken.substring(0, 40) + '...');

    // Check roles
    const roles = await fidj.fidjRoles();
    console.log('Roles:', roles);

    // Logout
    await fidj.logout(true);
    console.log('Logged out');
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node quickstart.ts
```

### Node.js (JavaScript)

Create `quickstart.js`:

```javascript
const {FidjNodeService} = require('@ofidj/node');

async function main() {
    const fidj = new FidjNodeService();

    await fidj.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
    console.log('Connected to sandbox');

    const user = await fidj.login('quickstart@fidj.ovh', 'test');
    console.log('Logged in as:', user.username, '- Roles:', user.roles);

    const idToken = await fidj.fidjGetIdToken();
    console.log('ID token:', idToken.substring(0, 40) + '...');

    await fidj.logout(true);
    console.log('Done!');
}

main().catch(console.error);
```

Run it:

```bash
node quickstart.js
```

### One-liner (init + login combined)

```typescript
const fidj = new FidjNodeService();
const user = await fidj.initAndLogin('quickstart@fidj.ovh', 'test');
// That's it - you're authenticated
```

### Web (browser / bundler)

```html
<script type="module">
import {FidjNodeService} from '@ofidj/node';

const fidj = new FidjNodeService();
await fidj.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
const user = await fidj.login('web-user@fidj.ovh', 'test');
document.getElementById('status').textContent = `Hello ${user.username}`;
</script>
```

## 3. Go further

### Call an API endpoint

```typescript
// POST to create something
const response = await fidj.sendOnEndpoint({
    verb: 'POST',
    key: 'apps',
    data: {title: 'MyApp'},
});
console.log('Created:', response.data);

// GET details
const details = await fidj.sendOnEndpoint({
    verb: 'GET',
    key: 'apps',
    relativePath: `${appId}/details`,
});
```

### Refresh tokens

```typescript
// Force token refresh
await fidj.sync({forceRefresh: true});
const freshToken = await fidj.fidjGetIdToken();
```

### Demo mode (no server needed)

```typescript
const fidj = new FidjNodeService();
const user = await fidj.initDemo();
// Uses mock JWT tokens, valid 24h - great for UI prototyping
```

### Production

```typescript
const fidj = new FidjNodeService();
// prod: true is the default
await fidj.init('your-app-id');
const user = await fidj.login('real@user.com', 'password');
```

## Troubleshooting

### Error 400: `Need a fidjId`

You called `init()` without a fidjId and with options. Either use zero-config (no args) or pass a valid fidjId.

```typescript
// Wrong
await fidj.init(undefined, {prod: false});

// Right - zero-config sandbox
await fidj.init();

// Right - explicit sandbox
await fidj.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
```

### Error 404: `Need one connection - or too old SDK version`

The SDK can't reach any API endpoint. Check:
- Network connectivity (`curl https://api.sandbox.fidj.ovh/v3`)
- Correct `prod` flag (`prod: false` for sandbox)
- SDK version (`npm ls @ofidj/node` - update if outdated)

### Error 404: `Need an initialized FidjService`

You called `login()` before `init()`. Always init first:

```typescript
// Wrong
await fidj.login('user@fidj.ovh', 'test');

// Right
await fidj.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
await fidj.login('user@fidj.ovh', 'test');
```

### Error 500: `Login failed` / timeout

Authentication server unreachable or credentials invalid. Steps:
1. Check sandbox status: `curl https://api.sandbox.fidj.ovh/v3`
2. On sandbox, any email/password combo auto-creates a user
3. Check `DEFAULT_TIMEOUT_MS` (60s) - increase for slow networks

### `TypeError: Cannot read properties of undefined`

Usually means you're using the result of a failed call. Wrap in try/catch:

```typescript
try {
    const user = await fidj.login('user@fidj.ovh', 'test');
    console.log(user.username);
} catch (err) {
    console.error('Login failed:', err.code, err.reason);
}
```

## Environments

| Environment | fidjId | Options | API URL |
|-------------|--------|---------|---------|
| Sandbox | `fidj-sandbox-0123fe7ed0000001` | `{prod: false}` | https://api.sandbox.fidj.ovh/v3 |
| Production | Your app ID | `{prod: true}` (default) | https://api.fidj.ovh/v3 |
