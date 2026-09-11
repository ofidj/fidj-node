import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import {FidjOidcClient} from '../../src/identity/FidjOidcClient';

const memoryStorage = () => {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
    };
};

// The API's OIDC provider is beta and serves nothing until an operator
// configures an issuer and signing keys. Everything below guards that gap: the
// client must refuse a stranger's issuer, it must fail with a sentence an
// integrator can act on when no provider answers, and the documentation must
// never present an issuer URL as if it were already operational.
describe('beta OIDC support', () => {
    const options = {
        issuer: 'http://localhost:3201/oidc',
        clientId: 'fidj-local-studio',
        redirectUri: 'http://localhost:8200/callback',
        apiEndpoint: 'http://localhost:3201/v3',
        storage: memoryStorage(),
    };

    it('refuses an issuer that is not the configured API', () => {
        assert.throws(
            () => new FidjOidcClient({...options, issuer: 'https://accounts.example.com/oidc'}),
            /trusted issuer/
        );
    });

    it('says plainly that no provider answered instead of leaking a fetch error', async () => {
        const client = new FidjOidcClient({
            ...options,
            issuer: 'http://127.0.0.1:9/oidc',
            apiEndpoint: 'http://127.0.0.1:9/v3',
        });
        try {
            await client.beginLogin();
            assert.fail('discovery against a closed port should not succeed');
        } catch (error: any) {
            assert.match(error.message, /no OpenID Connect provider/i);
            assert.match(error.message, /beta/i);
        }
    });

    it('is documented as beta wherever it is offered', () => {
        const files = [
            path.join(__dirname, '../../README.md'),
            path.join(__dirname, '../../../generator-fidj/README.md'),
        ];
        for (const file of files) {
            if (!fs.existsSync(file)) continue;
            const text = fs.readFileSync(file, 'utf8');
            const lines = text.split('\n');
            for (const [index, line] of lines.entries()) {
                if (!/oidc/i.test(line)) continue;
                const around = lines.slice(Math.max(0, index - 6), index + 7).join('\n');
                assert.match(
                    around,
                    /beta|experimental|no OIDC provider|no OpenID Connect provider|not an organization or OIDC provider|until an operator configures|Do not treat/i,
                    `${path.basename(file)}:${index + 1} mentions OIDC with no nearby beta caveat`
                );
            }
            // A copy-paste issuer in the docs reads as an offer, not a caveat.
            assert.notMatch(text, /https:\/\/api\.[a-z.]*fidj\.ovh\/oidc/i);
        }
    });
});
