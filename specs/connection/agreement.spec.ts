import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import axios from 'axios';
import {Client} from '../../src';
import {readableClientInfo} from '../../src/connection/Client';
use(spies);

describe('SDK explicit agreement', () => {
    afterEach(() => spy.restore());
    it('turns browser user agents into a short session label', () => {
        assert.equal(readableClientInfo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36'), 'Chrome on macOS');
        assert.equal(readableClientInfo('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'), 'Safari on iPhone');
    });
    it('forwards the actual choice and version to the app token endpoint', async () => {
        const calls: any[] = [];
        spy.on(axios, 'post', async (url, body) => {
            body = typeof body === 'string' ? JSON.parse(body) : body;
            calls.push({url, body: JSON.parse(JSON.stringify(body))});
            return {status: 201, data: url.endsWith('/users') ? {user: {id: 'user-a'}} : {token: {id: 'token', type: body.grant_type, data: 'token-data'}}};
        });
        const storage: any = {get: () => undefined, set: () => undefined};
        const logger: any = {log: () => {}, warn: () => {}, info: () => {}};
        const client = new Client('app-a', 'https://example.test/v3', storage, {} as any, logger);
        await client.login('person@test.local', 'test-password', undefined, {termsAccepted: true, termsVersion: 'agreement-2'});
        const tokens = calls.filter(call => call.url.endsWith('/tokens'));
        assert.equal(tokens.length, 3);
        assert.isTrue(tokens[0].body.termsAccepted);
        assert.equal(tokens[0].body.termsVersion, 'agreement-2');
        calls.length = 0;
        await client.login('person@test.local', 'test-password');
        assert.notProperty(calls[1].body, 'termsAccepted');
        assert.notProperty(calls[1].body, 'termsVersion');
    });
});
