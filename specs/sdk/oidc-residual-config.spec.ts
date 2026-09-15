import {assert} from 'chai';
import * as http from 'http';
import {AddressInfo} from 'net';
import {Base64} from '../../src/tools/Base64';
import {FidjNodeService} from '../../src/sdk/FidjNodeService';

// The Fidj door writes `fidj.oidc.<appId>.config` on a successful callback, and
// `clear()` — which runs whenever the provider session dies — removes the
// session but not that config. `oidc()` reads only the config, so the tab stays
// in provider mode for good: a later sign-in with an email and a password mints
// its three tokens and then never uses them, because every call starts with
// `if (this.oidc())` and finds no session behind it.
// Watched on fidj.ovh: POST /users answered 202, the three POST /tokens
// answered 201, and the screen still said "Sign in first".
describe('a password sign-in after the provider session died', () => {
    const appId = 'fidj-0123fe7ed0000001';
    const email = 'someone@example.com';
    const password = 'a-long-enough-password';
    let server: http.Server;
    let origin: string;
    let issued: string[];

    const jwt = (claims: object) =>
        'header.' +
        Base64.encode(JSON.stringify({exp: Math.floor(Date.now() / 1000) + 3600, ...claims})) +
        '.signature';

    const body = (req: http.IncomingMessage) =>
        new Promise<any>((resolve) => {
            let raw = '';
            req.on('data', (chunk) => (raw += chunk));
            req.on('end', () => resolve(raw ? JSON.parse(raw) : {}));
        });

    before(async () => {
        server = http.createServer(async (req, res) => {
            const url = new URL(req.url || '/', origin);
            const json = (code: number, payload: object) => {
                res.writeHead(code, {'content-type': 'application/json'});
                res.end(JSON.stringify(payload));
            };
            if (req.method === 'GET' && url.pathname === '/v3/status') {
                return json(200, {isOk: true});
            }
            if (req.method === 'POST' && url.pathname === '/v3/users') {
                return json(202, {user: {id: 'user-1', name: email}});
            }
            if (req.method === 'POST' && url.pathname === '/v3/apps/' + appId + '/tokens') {
                const grant = (await body(req)).grant_type;
                issued.push(grant);
                return json(201, {
                    token: {id: grant, type: grant, data: jwt({sub: 'user-1', roles: []})},
                });
            }
            res.writeHead(404).end();
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
        delete (globalThis as any).sessionStorage;
    });

    // What `clear()` leaves behind: the config of a provider sign-in whose
    // session is gone.
    beforeEach(() => {
        issued = [];
        const store = new Map<string, string>();
        (globalThis as any).sessionStorage = {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => void store.set(key, value),
            removeItem: (key: string) => void store.delete(key),
        };
        sessionStorage.setItem(
            'fidj.oidc.' + appId + '.config',
            JSON.stringify({
                issuer: origin + '/oidc',
                clientId: appId,
                redirectUri: 'http://127.0.0.1:8200/',
                apiEndpoint: origin + '/v3',
            })
        );
    });

    const signedIn = async () => {
        const srv = new FidjNodeService();
        await srv.init(appId, {prod: false, apiEndpoint: origin + '/v3'} as any);
        await srv.login(email, password);
        return srv;
    };

    it('mints the tokens it asked the API for', async () => {
        await signedIn();
        assert.deepEqual(issued, ['access_token', 'id_token', 'refresh_token']);
    });

    it('recognises the person it just signed in', async () => {
        const srv = await signedIn();
        assert.isTrue(srv.isLoggedIn(), 'a sign-in the API answered 201 to is a sign-in');
    });

    it('uses those tokens instead of answering "Sign in first"', async () => {
        const srv = await signedIn();
        await srv.sync();
    });

    // The same config outliving its session is the mild case. The sharp one is a
    // provider session that is still alive: routing on the config alone, the
    // person who types a credential is served the session already in the tab,
    // which on a shared computer is somebody else's.
    it('does not serve a live provider session to whoever types a credential', async () => {
        sessionStorage.setItem(
            'fidj.oidc.' + appId + '.session',
            JSON.stringify({
                tokens: {access_token: 'somebody-else'},
                identity: {sub: 'somebody-else'},
                expiresAt: Date.now() + 3600000,
            })
        );
        await signedIn();
        assert.isNull(
            sessionStorage.getItem('fidj.oidc.' + appId + '.session'),
            'the session that was in the tab is not the session that was asked for'
        );
    });
});
