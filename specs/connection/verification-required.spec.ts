import {assert, spy, use} from 'chai';
import spies from 'chai-spies';
import axios from 'axios';
import {Client, FidjError} from '../../src';
use(spies);

// Creating an account never signs anybody in. The account is created and the
// link is sent; the session waits for that link to be opened.
//
// Which case it is comes from the API without being asked: POST /v3/users
// answers 201 when it created the account and 202 when the account was already
// there and the password matched. Reading the status is what keeps this from
// needing a policy — every existing account still signs in exactly as before,
// verified or not, because none of them is being created here.
describe('SDK account creation', () => {
    afterEach(() => spy.restore());

    const login = async (usersStatus: number) => {
        const calls: string[] = [];
        spy.on(axios, 'post', async (url: string, body: any) => {
            calls.push(url);
            body = typeof body === 'string' ? JSON.parse(body) : body;
            return url.endsWith('/users')
                ? {status: usersStatus, data: {user: {id: 'user-a'}}}
                : {
                      status: 201,
                      data: {token: {id: 't', type: body.grant_type, data: 'token-data'}},
                  };
        });
        const storage: any = {get: () => undefined, set: () => undefined};
        const logger: any = {log: () => {}, warn: () => {}, info: () => {}};
        const client = new Client('app-a', 'https://example.test/v3', storage, {} as any, logger);
        try {
            const tokens = await client.login('person@test.local', 'a-long-enough-password');
            return {tokens, calls, error: null as any};
        } catch (error) {
            return {tokens: null, calls, error};
        }
    };

    it('stops at the account it just created, and asks for no token', async () => {
        const {error, calls, tokens} = await login(201);
        assert.isNull(tokens, 'a created account is not a session');
        assert.instanceOf(error, FidjError);
        assert.equal(error.reason, 'verification-required');
        assert.deepEqual((error as any).details, {email: 'person@test.local'});
        assert.deepEqual(
            calls.filter((url) => url.endsWith('/tokens')),
            [],
            'no token is requested for an account nobody has proved they own'
        );
    });

    it('signs in an account that was already there', async () => {
        const {error, calls, tokens} = await login(202);
        assert.isNull(error, error && String(error.reason));
        assert.isNotNull(tokens);
        assert.equal(
            calls.filter((url) => url.endsWith('/tokens')).length,
            3,
            'access, id and refresh, as before'
        );
    });
});

// The refusal that matters most has to survive every layer between the socket
// and the screen. Both layers used to rebuild it, so proving it at one of them
// proved nothing: this asks the question through the real Client.
describe('SDK agreement refusal', () => {
    afterEach(() => spy.restore());

    it('carries the agreement the token endpoint refused with', async () => {
        const agreement = {version: '2026-09-11', text: 'The full agreement.'};
        spy.on(axios, 'post', async (url: string) => {
            if (url.endsWith('/users')) {
                return {status: 202, data: {user: {id: 'user-a'}}};
            }
            throw {
                status: 409,
                code: 409,
                response: {
                    status: 409,
                    data: {code: 'agreement_required', message: 'Accept it.', agreement},
                },
            };
        });
        const storage: any = {get: () => undefined, set: () => undefined};
        const logger: any = {log: () => {}, warn: () => {}, info: () => {}};
        const client = new Client('app-a', 'https://example.test/v3', storage, {} as any, logger);
        try {
            await client.login('person@test.local', 'a-long-enough-password');
            assert.fail('the token endpoint refused; login must not resolve');
        } catch (error: any) {
            assert.equal(error.code, 409);
            assert.deepEqual((error.details as any)?.agreement, agreement);
        }
    });
});
