// Quickstart: connect to a locally-running fidj-api (NODE_ENV=sandbox, in-memory mongo)
// Prereq: `cd fidj-api && NODE_ENV=sandbox npm start` (default port 3201)
// Run:    npx ts-node examples/quickstart-local.ts

import {FidjNodeService} from '../src';

async function main() {
    const fidj = new FidjNodeService();

    await fidj.init('fidj-sandbox-0123fe7ed0000001', {
        prod: false,
        apiEndpoint: 'http://localhost:3201/v3',
    });

    const email = `local_${Date.now()}@fidj.ovh`;
    const user = await fidj.login(email, 'test');
    console.log(`Logged in as ${user.username} against local fidj-api`);

    await fidj.logout(true);
}

main().catch((err) => {
    console.error('Error:', err.code || err.message, err.reason || '');
    process.exit(1);
});
