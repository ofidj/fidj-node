// Quickstart example: connect to fidj sandbox, login, and explore the API
// Run: npx ts-node examples/quickstart-sandbox.ts

import {FidjNodeService} from '../src';

async function main() {
    const fidj = new FidjNodeService();

    // Step 1: Init on sandbox
    console.log('1. Connecting to sandbox...');
    await fidj.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
    console.log('   Connected!');

    // Step 2: Login (sandbox auto-creates users)
    const email = `quickstart_${Date.now()}@fidj.ovh`;
    console.log(`2. Logging in as ${email}...`);
    const user = await fidj.login(email, 'test');
    console.log(`   Welcome ${user.username} (roles: ${user.roles.join(', ')})`);

    // Step 3: Get your JWT token
    console.log('3. Getting ID token...');
    const idToken = await fidj.fidjGetIdToken();
    console.log(`   Token: ${idToken.substring(0, 50)}...`);

    // Step 4: Refresh tokens
    console.log('4. Refreshing tokens...');
    await fidj.sync({forceRefresh: true});
    console.log('   Tokens refreshed!');

    // Step 5: Check roles
    const roles = await fidj.fidjRoles();
    console.log(`5. Your roles: ${roles.join(', ')}`);

    // Step 6: Create an app
    console.log('6. Creating an app...');
    try {
        const response = await fidj.sendOnEndpoint({
            verb: 'POST',
            key: 'apps',
            data: {title: `QuickstartApp_${Date.now()}`},
        });
        console.log(`   App created: ${JSON.stringify(response.data?.app?.title || response.data)}`);
    } catch (err) {
        console.log(`   App creation returned: ${err.code} - ${JSON.stringify(err.reason || err.message)}`);
    }

    // Step 7: Logout
    await fidj.logout(true);
    console.log('7. Logged out. Done!');
}

main().catch((err) => {
    console.error('Error:', err.code || err.message, err.reason || '');
    process.exit(1);
});
