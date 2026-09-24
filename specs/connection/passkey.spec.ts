import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import axios from 'axios';
import {Client} from '../../src';
use(spies);

// Passkeys (v3 P1-4): the browser runs the ceremony; the SDK trades its answer
// for a short grant, then mints the three tokens with it the way a password
// sign-in does, agreement included.
describe('SDK passkey sign-in', () => {
    afterEach(() => spy.restore());
    it('trades the passkey answer for a grant, then mints tokens with it', async () => {
        const calls: any[] = [];
        spy.on(axios, 'post', async (url, body, config) => {
            body = typeof body === 'string' ? JSON.parse(body) : body;
            calls.push({url, body, headers: config?.headers || {}});
            if (url.endsWith('/passkeys/login')) {
                return {status: 200, data: {grant: 'grant-1', username: 'keyholder@test.local'}};
            }
            return {
                status: 201,
                data: {token: {id: 'token', type: body.grant_type, data: 'token-data'}},
            };
        });
        const storage: any = {get: () => undefined, set: () => undefined};
        const logger: any = {log: () => {}, warn: () => {}, info: () => {}};
        const client = new Client('app-a', 'https://example.test/v3', storage, {} as any, logger);

        const tokens = await client.loginWithPasskey(
            'ticket-1',
            {id: 'credential'},
            {termsAccepted: true, termsVersion: 'agreement-2'}
        );

        assert.equal(calls[0].url, 'https://example.test/v3/passkeys/login');
        assert.deepEqual(calls[0].body, {ticket: 'ticket-1', response: {id: 'credential'}});
        const minted = calls.filter((call) => call.url.endsWith('/tokens'));
        assert.equal(minted.length, 3);
        assert.equal(minted[0].headers.Authorization, 'Passkey grant-1');
        assert.isTrue(minted[0].body.termsAccepted);
        assert.equal(tokens.username, 'keyholder@test.local');
    });
});
