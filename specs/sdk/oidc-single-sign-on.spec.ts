import {assert} from 'chai';
import * as http from 'http';
import {AddressInfo} from 'net';
import {FidjOidcClient} from '../../src/identity/FidjOidcClient';

const memoryStorage = () => {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
    };
};

// A single sign-on provider that asks for the password again on every app is
// not a single sign-on provider. The client decides that with one parameter:
// `prompt=login` means "ignore the session you have", `prompt=consent` means
// "ignore the grant you stored". Sending either by default throws away the
// 24-hour session and the 90-day grant the provider is configured to keep, so
// the authorization request must carry neither unless the caller asks for it.
describe('single sign-on across apps', () => {
    let server: http.Server;
    let issuer: string;
    let origin: string;

    before(async () => {
        server = http.createServer((req, res) => {
            if (!req.url?.endsWith('/.well-known/openid-configuration')) {
                res.writeHead(404).end();
                return;
            }
            res.writeHead(200, {'content-type': 'application/json'});
            res.end(
                JSON.stringify({
                    issuer,
                    authorization_endpoint: origin + '/oidc/auth',
                    token_endpoint: origin + '/oidc/token',
                    jwks_uri: origin + '/oidc/jwks',
                })
            );
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
        issuer = origin + '/oidc';
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    const client = () =>
        new FidjOidcClient({
            issuer,
            clientId: 'fidj-local-studio',
            redirectUri: 'http://127.0.0.1:8200/',
            apiEndpoint: origin + '/v3',
            storage: memoryStorage(),
        });

    it('does not ask the provider to forget the person', async () => {
        const url = new URL(await client().beginLogin());
        assert.isNull(
            url.searchParams.get('prompt'),
            'a plain sign-in must reuse the provider session and the stored grant'
        );
    });

    it('asks silently when the caller wants an answer without a screen', async () => {
        const url = new URL(await client().beginLogin({silent: true}));
        assert.equal(url.searchParams.get('prompt'), 'none');
    });

    it('still lets an app force a fresh credential check', async () => {
        const url = new URL(await client().beginLogin({prompt: 'login'}));
        assert.equal(url.searchParams.get('prompt'), 'login');
    });

    it('keeps every other authorization parameter it already sent', async () => {
        const url = new URL(await client().beginLogin());
        assert.equal(url.searchParams.get('response_type'), 'code');
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        assert.include(url.searchParams.get('scope') || '', 'openid');
        assert.isNotEmpty(url.searchParams.get('state'));
        assert.isNotEmpty(url.searchParams.get('nonce'));
    });

    // A silent attempt answers with an error in the callback rather than a
    // screen. The app has to be able to tell "not signed in" from a real
    // failure, because the first one means "show the button" and the second
    // means "something is broken".
    // Signing out has one desired end state, and the local session is always
    // reachable. A server that refuses the call — because the credential just
    // changed, because the session was already revoked — has not prevented the
    // sign-out, so it must not be reported as a failure over a success the
    // person already got.
    it('signs out even when the server refuses the call', async () => {
        const storage = memoryStorage();
        const instance = new FidjOidcClient({
            issuer,
            clientId: 'fidj-local-studio',
            redirectUri: 'http://127.0.0.1:8200/',
            apiEndpoint: origin + '/v3',
            storage,
        });
        // A live-looking session whose token the server will refuse: the /v3
        // endpoint is not served by the discovery stub, so the call fails.
        storage.setItem(
            'fidj.oidc.fidj-local-studio.session',
            JSON.stringify({tokens: {access_token: 'stale'}, identity: {}, expiresAt: Date.now() + 60000})
        );
        assert.isTrue(instance.hasSession());
        await instance.logout();
        assert.isFalse(instance.hasSession(), 'the local session must be gone');
    });

    it('names a silent refusal so the app can fall back to the full screen', async () => {
        const instance = client();
        const url = new URL(await instance.beginLogin({silent: true}));
        const callback = new URL('http://127.0.0.1:8200/');
        callback.searchParams.set('error', 'login_required');
        callback.searchParams.set('state', url.searchParams.get('state') || '');
        callback.searchParams.set('iss', issuer);
        try {
            await instance.completeLogin(callback);
            assert.fail('a login_required callback is not a completed login');
        } catch (error: any) {
            assert.equal(error.code, 'login_required');
            assert.isTrue(error.silentRefusal, 'the app must be able to retry interactively');
        }
    });
});
