import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import {createServer} from 'http';
import {AddressInfo} from 'net';
import {FidjNodeService} from '../../src';
use(spies);
describe('SDK account recovery', () => {
    it('posts recovery data without a session and clears the local session after reset', async () => {
        const calls: any[] = [];
        const server = createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
                calls.push({
                    method: req.method,
                    path: req.url,
                    body: JSON.parse(body),
                    authorization: req.headers.authorization,
                });
                res.writeHead(204);
                res.end();
            });
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const sdk = new FidjNodeService();
        let cleared = false;
        spy.on((sdk as any).connection, 'getApiEndpoints', async () => [
            {url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v3/`},
        ]);
        spy.on(sdk, 'logout', async () => {
            cleared = true;
        });
        try {
            await sdk.fidjForgotPasswordRequest('person@example.test');
            await sdk.resetPassword({token: 'reset-token', password: 'chosen-password'});
            await sdk.verifyEmail({token: 'verification-token'});
            assert.isTrue(cleared);
            assert.deepEqual(
                calls.map((call) => call.path),
                ['/v3/me/forgot', '/v3/me/reset-password', '/v3/users/verify-email']
            );
            assert.deepEqual(calls[1].body, {token: 'reset-token', password: 'chosen-password'});
            assert.isTrue(calls.every((call) => call.method === 'POST' && !call.authorization));
        } finally {
            spy.restore(sdk);
            spy.restore((sdk as any).connection);
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});
