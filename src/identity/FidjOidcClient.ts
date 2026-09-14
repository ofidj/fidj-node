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
    // The API's provider is beta and serves nothing until an operator sets an
    // issuer and signing keys, so "no provider answered" is the common case.
    // Anyone pointing an app at an issuer that does not answer deserves that
    // sentence, not a bare 'fetch failed'.
    private async discover(issuer: URL) {
        try {
            return await oauth.processDiscoveryResponse(issuer, await oauth.discoveryRequest(issuer, {...this.network(), algorithm: 'oidc'}));
        } catch (cause) {
            throw Object.assign(new Error('No OpenID Connect provider answered at ' + issuer.href + '. OIDC support is beta: check the deployment configures an issuer and signing keys before using it.'), {cause});
        }
    }
    private async discovery() {
        if (!this.metadata) {const issuer = new URL(this.options.issuer); this.metadata = await this.discover(issuer);
            for (const endpoint of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) if (new URL(String(this.metadata[endpoint])).origin !== issuer.origin) throw new Error('Unexpected identity endpoint origin');
            if (this.metadata.end_session_endpoint && new URL(String(this.metadata.end_session_endpoint)).origin !== issuer.origin) throw new Error('Unexpected identity endpoint origin');
        }
        return this.metadata;
    }
    hasSession() {return !!this.options.storage.getItem(this.prefix + '.session');}
    // Somebody who signed out of Fidj itself must not be recognised again on the
    // next render. Ending the provider session is what makes that true, and that
    // call can be refused — the sign-out watched in production answered 503 — so
    // the fact they asked outlives it. A sign-in screen reads this to know it has
    // to ask rather than assume, and signing in again is what forgets it.
    signedOutHere(): boolean {return this.options.storage.getItem(this.prefix + '.signedOut') === 'true';}
    private session() {return JSON.parse(this.options.storage.getItem(this.prefix + '.session') || 'null');}
    // No `prompt` by default: sending `login consent` asked the provider to
    // ignore the session and the grant it is configured to keep, so every app
    // re-collected a password a person had just typed for another one. `silent`
    // asks for an answer without a screen (it comes back as an error when the
    // person is not signed in); `prompt` stays available for a step-up check an
    // app decides it needs.
    async beginLogin(options: {silent?: boolean; prompt?: string} = {}) {
        const as = await this.discovery(), verifier = oauth.generateRandomCodeVerifier(), state = oauth.generateRandomState(), nonce = oauth.generateRandomNonce();
        this.options.storage.setItem(this.prefix + '.transaction', JSON.stringify({verifier, state, nonce, createdAt: Date.now()}));
        const prompt = options.silent ? 'none' : options.prompt;
        const url = new URL(as.authorization_endpoint);
        url.search = new URLSearchParams({client_id: this.options.clientId, redirect_uri: this.options.redirectUri, response_type: 'code', scope: 'openid profile email offline_access fidj:api', ...(prompt ? {prompt} : {}), state, nonce, code_challenge: await oauth.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256'}).toString();
        return url.href;
    }
    async completeLogin(callback: URL) {
        const transaction = JSON.parse(this.options.storage.getItem(this.prefix + '.transaction') || 'null');
        this.options.storage.removeItem(this.prefix + '.transaction');
        const expected = new URL(this.options.redirectUri);
        if (!transaction || Date.now() - transaction.createdAt > 600000 || callback.origin !== expected.origin || callback.pathname !== expected.pathname) throw new Error('Login transaction expired or callback mismatch');
        // A silent attempt answers in the callback, not on screen. "You are not
        // signed in" and "this app has no grant yet" are both invitations to ask
        // again with a screen, so they must reach the caller as themselves
        // rather than as one opaque authorization error.
        const refusal = callback.searchParams.get('error');
        if (refusal) throw Object.assign(new Error(callback.searchParams.get('error_description') || refusal), {code: refusal, silentRefusal: ['login_required', 'consent_required', 'interaction_required', 'account_selection_required'].includes(refusal)});
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
    private save(tokens: any, identity: any) {this.options.storage.removeItem(this.prefix + '.signedOut'); this.options.storage.setItem(this.prefix + '.session', JSON.stringify({tokens, identity, expiresAt: Date.now() + Number(tokens.expires_in || 300) * 1000}));}
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
    // Where the provider ends the session it recognises this browser by, for a
    // caller that can leave the page. Nothing here ends anything on its own: the
    // hint and the return address are what let the provider finish without
    // asking the person which account they meant.
    private async endSessionUrl(): Promise<string | undefined> {
        const session = this.session(), endpoint = (await this.discovery()).end_session_endpoint;
        if (!endpoint || !session?.tokens?.id_token) return undefined;
        const url = new URL(String(endpoint));
        url.search = new URLSearchParams({client_id: this.options.clientId, id_token_hint: session.tokens.id_token, post_logout_redirect_uri: this.options.redirectUri}).toString();
        return url.href;
    }
    // Signing out has one desired end state and the local session is always
    // reachable, so this never rejects. A server that refuses the call — the
    // credential just changed, the session was already revoked, the network is
    // gone — has not kept the person signed in, and reporting a failure over a
    // success they already got is how a password change ends in "Request
    // failed" on top of a password that did change.
    // An app's sign-out ends that app's access and nothing else: the provider
    // session is what the person's other apps recognise them by, and ending it
    // from one of them signs them out of all of them. `endProviderSession` is
    // Fidj's own sign-out, which means the opposite — and returns where to finish
    // it, because only the caller can leave the page.
    async logout(options: {endProviderSession?: boolean} = {}): Promise<string | undefined> {
        const endSession = options.endProviderSession ? await this.endSessionUrl().catch(() => undefined) : undefined;
        let confirmed = false;
        try {if (this.hasSession()) await this.request('/me/oidc/logout', 'POST', {endProviderSession: !!options.endProviderSession}); confirmed = true;} catch {} finally {this.clear();}
        if (options.endProviderSession) this.options.storage.setItem(this.prefix + '.signedOut', 'true');
        return confirmed ? undefined : endSession;
    }
    clear() {this.options.storage.removeItem(this.prefix + '.session'); this.options.storage.removeItem(this.prefix + '.transaction');}
}
