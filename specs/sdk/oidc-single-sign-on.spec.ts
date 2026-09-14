import {assert} from 'chai';
import * as http from 'http';
import {AddressInfo} from 'net';
import {FidjOidcClient} from '../../src/identity/FidjOidcClient';
import {FidjNodeService} from '../../src/sdk/FidjNodeService';

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
    // What the API answers the sign-out call with, and what it was told.
    let signOutStatus = 204;
    let signOutAsked: any;

    before(async () => {
        server = http.createServer((req, res) => {
            if (req.url?.endsWith('/.well-known/openid-configuration')) {
                res.writeHead(200, {'content-type': 'application/json'});
                res.end(
                    JSON.stringify({
                        issuer,
                        authorization_endpoint: origin + '/oidc/auth',
                        token_endpoint: origin + '/oidc/token',
                        end_session_endpoint: origin + '/oidc/session/end',
                        jwks_uri: origin + '/oidc/jwks',
                    })
                );
                return;
            }
            if (req.method === 'POST' && req.url === '/v3/me/oidc/logout') {
                let raw = '';
                req.on('data', (chunk) => (raw += chunk));
                req.on('end', () => {
                    signOutAsked = raw ? JSON.parse(raw) : null;
                    res.writeHead(signOutStatus, {'content-type': 'application/json'});
                    res.end(signOutStatus === 204 ? undefined : '{}');
                });
                return;
            }
            res.writeHead(404).end();
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
        signOutStatus = 503;
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
            JSON.stringify({
                tokens: {access_token: 'stale'},
                identity: {},
                expiresAt: Date.now() + 60000,
            })
        );
        assert.isTrue(instance.hasSession());
        try {
            await instance.logout();
        } finally {
            signOutStatus = 204;
        }
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

    // Signing out of an app is not signing out of Fidj. The provider session is
    // what makes the next app recognise the person, so an app ending it would
    // sign them out of every other one. Fidj's own sign-out is the opposite
    // case: leaving that session alive is what walks the person straight back in
    // on the next render, which is exactly the bug this covers.
    describe('ending the provider session', () => {
        const signedIn = () => {
            const storage = memoryStorage();
            const instance = new FidjOidcClient({
                issuer,
                clientId: 'fidj-local-studio',
                redirectUri: 'http://127.0.0.1:8200/',
                apiEndpoint: origin + '/v3',
                storage,
            });
            storage.setItem(
                'fidj.oidc.fidj-local-studio.session',
                JSON.stringify({
                    tokens: {access_token: 'stale', id_token: 'header.payload.signature'},
                    identity: {},
                    expiresAt: Date.now() + 60000,
                })
            );
            return {instance, storage};
        };

        beforeEach(() => {
            signOutStatus = 204;
            signOutAsked = undefined;
        });

        it('leaves the provider session alone when an app signs out', async () => {
            const {instance} = signedIn();
            assert.isUndefined(
                await instance.logout(),
                'an app sign-out must keep single sign-on for the other apps'
            );
            assert.deepEqual(signOutAsked, {endProviderSession: false});
            assert.isFalse(instance.hasSession());
            assert.isFalse(instance.signedOutHere());
        });

        it('asks the API to end the provider session when Fidj itself signs out', async () => {
            const {instance} = signedIn();
            assert.isUndefined(
                await instance.logout({endProviderSession: true}),
                'a confirmed sign-out is finished; there is nowhere left to send anybody'
            );
            assert.deepEqual(signOutAsked, {endProviderSession: true});
            assert.isFalse(instance.hasSession());
        });

        // The call can be refused — the sign-out watched in production answered
        // 503, silently — and the provider would then still recognise the
        // browser. RP-initiated logout is how the person finishes it themselves.
        it('hands back the provider sign-out to finish when the API cannot confirm it', async () => {
            signOutStatus = 503;
            const {instance} = signedIn();
            const url = new URL((await instance.logout({endProviderSession: true})) as string);
            assert.equal(url.origin + url.pathname, origin + '/oidc/session/end');
            assert.equal(url.searchParams.get('id_token_hint'), 'header.payload.signature');
            assert.equal(
                url.searchParams.get('post_logout_redirect_uri'),
                'http://127.0.0.1:8200/'
            );
            assert.equal(url.searchParams.get('client_id'), 'fidj-local-studio');
            assert.isFalse(instance.hasSession(), 'the local session must be gone either way');
        });

        // Whether or not the provider was reached, the screen the person lands on
        // cannot assume Fidj has forgotten them. It has to be able to ask.
        it('remembers that this browser asked to be signed out', async () => {
            const {instance} = signedIn();
            await instance.logout({endProviderSession: true});
            assert.isTrue(instance.signedOutHere());
        });

        // The two sign-outs an app can mean are two calls on the facade, because
        // the console is the only caller that is Fidj itself.
        it("separates an app sign-out from Fidj's own on the facade", async () => {
            signOutStatus = 503;
            const app = new FidjNodeService();
            (app as any).oidcClient = signedIn().instance;
            assert.isUndefined(await app.logout(), 'an app sign-out keeps single sign-on');

            const fidj = new FidjNodeService();
            const console_ = signedIn().instance;
            (fidj as any).oidcClient = console_;
            const url = new URL((await fidj.logoutFromFidj()) as string);
            assert.equal(url.origin + url.pathname, origin + '/oidc/session/end');
            assert.isTrue(console_.signedOutHere());
        });
    });
});
