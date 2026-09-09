import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import {createServer} from 'http';
import {AddressInfo} from 'net';
import {FidjNodeService} from '../../src';

use(spies);

describe('Confirmed SDK departures', () => {
    it('delivers the confirmation body through the SDK and HTTP adapter', async () => {
        let received: any;
        const server = createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
                received = {method: req.method, path: req.url, body: JSON.parse(body || '{}')};
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({status: 'completed'}));
            });
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const sdk = new FidjNodeService();
        spy.on(sdk, 'sync', async () => {});
        spy.on(sdk, 'fidjGetEndpoints', async () => []);
        spy.on((sdk as any).connection, 'getIdToken', async () => 'local-test-token');
        try {
            await sdk.sendOnEndpoint({
                verb: 'DELETE',
                key: 'me',
                relativePath: 'apps/test-app',
                defaultKeyUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/me`,
                data: {confirm: 'test-app'},
            });
            assert.deepEqual(received, {
                method: 'DELETE',
                path: '/me/apps/test-app',
                body: {confirm: 'test-app'},
            });
        } finally {
            spy.restore(sdk);
            spy.restore((sdk as any).connection);
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});
