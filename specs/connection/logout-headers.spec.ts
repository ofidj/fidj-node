import {assert} from 'chai';
import * as http from 'http';
import {AddressInfo} from 'net';
import {Base64} from '../../src/tools/Base64';
import {Client} from '../../src/connection/Client';
import {LoggerService} from '../../src/sdk/LoggerService';

// Signing out asks the API to end the tokens it issued, and in a browser that
// request never arrived: the timeout was written inside `headers`, so a request
// header literally named `timeout` went out, and the API's CORS allowlist —
// Content-Type, Authorization, X-Requested-With — refuses it at the preflight.
//
//   Access to XMLHttpRequest at '.../tokens' from origin 'https://sandbox.fidj.ovh'
//   has been blocked by CORS policy: Request header field timeout is not allowed
//
// The local session was cleared either way, so it looked like a sign-out. The
// refresh token stayed live on the server for its full term.
describe('signing out', () => {
    let server: http.Server;
    let origin: string;
    let received: http.IncomingHttpHeaders;
    let method = '';

    const storage = () => {
        const store = new Map<string, any>();
        return {
            set: (key: string, value: any) => void store.set(key, value),
            get: (key: string) => store.get(key),
            remove: (key: string) => void store.delete(key),
        } as any;
    };

    before(async () => {
        server = http.createServer((req, res) => {
            received = req.headers;
            method = req.method || '';
            res.writeHead(200, {'content-type': 'application/json'});
            res.end('{}');
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    const refreshToken =
        'header.' + Base64.encode(JSON.stringify({exp: Date.now() / 1000 + 3600})) + '.signature';

    it('sends only headers a browser is allowed to send', async () => {
        const client = new Client('fidj-app', origin, storage(), {} as any, new LoggerService());
        client.setClientId('someone@example.com');
        await client.logout(refreshToken);

        assert.equal(method, 'DELETE');
        assert.notProperty(
            received,
            'timeout',
            'a request header named "timeout" is refused by the API preflight'
        );
        assert.equal(received.authorization, 'Bearer ' + refreshToken);
    });
});
