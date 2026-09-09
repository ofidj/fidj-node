import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import {createServer} from 'http';
import {AddressInfo} from 'net';
import {FidjNodeService} from '../../src';
use(spies);
describe('Live SDK roles', () => {
    it('reads current direct/group access and rejects a revoked session instead of cached roles', async () => {
        let roles = ['Free', 'Editor'];
        let revoked = false;
        const server = createServer((req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (revoked) {
                res.writeHead(403);
                res.end('{}');
            } else res.end(JSON.stringify({roles: roles.map((type) => ({type}))}));
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const sdk = new FidjNodeService();
        const connection = (sdk as any).connection;
        connection.fidjId = 'test-app';
        const token =
            'header.' +
            Buffer.from(
                JSON.stringify({
                    sub: 'member',
                    aud: 'test-app',
                    name: 'member@test.local',
                    roles: ['Owner'],
                })
            ).toString('base64url') +
            '.signature';
        spy.on(sdk, 'isLoggedIn', () => true);
        spy.on(sdk, 'fidjGetIdToken', async () => token);
        spy.on(connection, 'getApiEndpoints', async () => [
            {url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`},
        ]);
        try {
            assert.deepEqual(await sdk.fidjRoles(), ['Free', 'Editor']);
            roles = ['Free'];
            assert.deepEqual(await sdk.fidjRoles(), ['Free']);
            revoked = true;
            let rejected = false;
            try {
                await sdk.fidjRoles();
            } catch {
                rejected = true;
            }
            assert.isTrue(rejected);
        } finally {
            spy.restore(sdk);
            spy.restore(connection);
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});
