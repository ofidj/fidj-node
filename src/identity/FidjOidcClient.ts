import * as oauth from 'oauth4webapi';
export interface OidcOptions {issuer: string; clientId: string; redirectUri: string; apiEndpoint: string; storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;}
export class FidjOidcClient {
    private metadata: oauth.AuthorizationServer;
    private refreshPending: Promise<void>;
    private readonly prefix: string;
    constructor(private options: OidcOptions) {
        const issuer = new URL(options.issuer), api = new URL(options.apiEndpoint), redirect = new URL(options.redirectUri);
        if (issuer.origin !== api.origin || issuer.pathname !== '/oidc' || issuer.search || issuer.hash || issuer.username || issuer.password || (issuer.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(issuer.hostname)) || redirect.hash || redirect.username || redirect.password || (redirect.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(redirect.hostname))) throw new Error('Use a trusted issuer/API origin and an exact HTTPS callback (loopback allowed for development).');
        this.prefix = 'fidj.oidc.' + options.clientId;
    }
    private network() {return {...(this.options.issuer.startsWith('http:') ? {[oauth.allowInsecureRequests]: true} : {}), signal: AbortSignal.timeout(10000)};}
    private async discovery() {
        if (!this.metadata) {const issuer = new URL(this.options.issuer); this.metadata = await oauth.processDiscoveryResponse(issuer, await oauth.discoveryRequest(issuer, {...this.network(), algorithm: 'oidc'}));
            for (const endpoint of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) if (new URL(String(this.metadata[endpoint])).origin !== issuer.origin) throw new Error('Unexpected identity endpoint origin');
        }
        return this.metadata;
    }
    hasSession() {return !!this.options.storage.getItem(this.prefix + '.session');}
    private session() {return JSON.parse(this.options.storage.getItem(this.prefix + '.session') || 'null');}
    async beginLogin() {
        const as = await this.discovery(), verifier = oauth.generateRandomCodeVerifier(), state = oauth.generateRandomState(), nonce = oauth.generateRandomNonce();
        this.options.storage.setItem(this.prefix + '.transaction', JSON.stringify({verifier, state, nonce, createdAt: Date.now()}));
        const url = new URL(as.authorization_endpoint);
        url.search = new URLSearchParams({client_id: this.options.clientId, redirect_uri: this.options.redirectUri, response_type: 'code', scope: 'openid profile email offline_access fidj:api', prompt: 'login consent', state, nonce, code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256'}).toString();
        return url.href;
    }
    async completeLogin(callback: URL) {
        const transaction = JSON.parse(this.options.storage.getItem(this.prefix + '.transaction') || 'null');
        this.options.storage.removeItem(this.prefix + '.transaction');
        const expected = new URL(this.options.redirectUri);
        if (!transaction || Date.now() - transaction.createdAt > 600000 || callback.origin !== expected.origin || callback.pathname !== expected.pathname) throw new Error('Login transaction expired or callback mismatch');
        const as = await this.discovery(), client = {client_id: this.options.clientId};
        const params = oauth.validateAuthResponse(as, client, callback, transaction.state);
        const response = await oauth.authorizationCodeGrantRequest(as, client, oauth.None(), params, this.options.redirectUri, transaction.verifier, this.network());
        const tokens = await oauth.processAuthorizationCodeResponse(as, client, response, {expectedNonce: transaction.nonce, requireIdToken: true});
        await oauth.validateApplicationLevelSignature(as, response, this.network());
        const identity = oauth.getValidatedIdTokenClaims(tokens);
        this.save(tokens, identity);
        const {storage, ...publicOptions} = this.options;
        storage.setItem(this.prefix + '.config', JSON.stringify(publicOptions));
        return identity;
    }
    private save(tokens: any, identity: any) {this.options.storage.setItem(this.prefix + '.session', JSON.stringify({tokens, identity, expiresAt: Date.now() + Number(tokens.expires_in || 300) * 1000}));}
    async accessToken() {
        const session = this.session();
        if (!session) throw Object.assign(new Error('Sign in first'), {code: 401});
        if (session.expiresAt < Date.now() + 30000) {
            if (!this.refreshPending) this.refreshPending = this.refresh().finally(() => {this.refreshPending = undefined;});
            await this.refreshPending;
        }
        return this.session().tokens.access_token as string;
    }
    private async refresh() {
        const session = this.session();
        try {
            const as = await this.discovery(), client = {client_id: this.options.clientId};
            if (!session?.tokens.refresh_token) throw new Error('No refresh token');
            const response = await oauth.refreshTokenGrantRequest(as, client, oauth.None(), session.tokens.refresh_token, this.network());
            const tokens = await oauth.processRefreshTokenResponse(as, client, response);
            if (tokens.id_token) await oauth.validateApplicationLevelSignature(as, response, this.network());
            this.save(tokens, session.identity);
        } catch (error) {this.clear(); throw Object.assign(new Error('Session expired; sign in again'), {code: 401, cause: error});}
    }
    async request(path: string, method = 'GET', data?: unknown): Promise<any> {
        if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) throw new Error('Use an API-relative path');
        const response = await fetch(this.options.apiEndpoint.replace(/\/$/, '') + path, {method, headers: {Authorization: 'Bearer ' + await this.accessToken(), 'Content-Type': 'application/json'}, body: data === undefined ? undefined : JSON.stringify(data), redirect: 'error', signal: AbortSignal.timeout(10000)});
        const result = response.status === 204 ? undefined : await response.json();
        if (!response.ok) {if (response.status === 401) this.clear(); throw Object.assign(new Error(result?.message || 'Request failed'), {code: response.status});}
        return {status: response.status, data: result};
    }
    async logout() {try {if (this.hasSession()) await this.request('/me/oidc/logout', 'POST', {});} finally {this.clear();}}
    clear() {this.options.storage.removeItem(this.prefix + '.session'); this.options.storage.removeItem(this.prefix + '.transaction');}
}
