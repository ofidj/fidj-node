import {Ajax} from './Ajax';
import * as tools from '../tools';
import {LocalStorage} from '../tools';
import {ErrorInterface, FidjError, FidjNodeService, LoggerInterface, SdkInterface} from '../sdk';
import {ClientTokens} from './ClientTokens';
import {ClientUser} from './ClientUser';
import {ClientToken} from './ClientToken';

export function readableClientInfo(userAgent: string): string {
    const browser = /Edg\//.test(userAgent)
        ? 'Edge'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Chrome\//.test(userAgent)
            ? 'Chrome'
            : /Safari\//.test(userAgent)
              ? 'Safari'
              : 'Browser';
    const device = /iPhone/.test(userAgent)
        ? 'iPhone'
        : /iPad/.test(userAgent)
          ? 'iPad'
          : /Android/.test(userAgent)
            ? 'Android'
            : /Macintosh|Mac OS X/.test(userAgent)
              ? 'macOS'
              : /Windows/.test(userAgent)
                ? 'Windows'
                : /Linux/.test(userAgent)
                  ? 'Linux'
                  : 'unknown device';
    return `${browser} on ${device}`;
}

export class Client {
    // private refreshToken: string;
    private static refreshCountInitial = 1;
    private static refreshCount = Client.refreshCountInitial;
    public clientId: string;
    private _clientUuid: string;
    private _clientId: string;
    private _refreshCount: string;
    private clientUuid: string;
    private clientInfo: string;

    constructor(
        private appId: string,
        private URI: string,
        private storage: LocalStorage,
        private sdk: SdkInterface,
        private logger: LoggerInterface
    ) {
        this._clientUuid = 'v2.clientUuid.' + appId;
        this._clientId = 'v2.clientId.' + appId;
        this._refreshCount = 'v2.refreshCount.' + appId;

        let uuid: string = this.storage.get(this._clientUuid) || 'uuid-' + Math.random();
        let info = '_clientInfo'; // this.storage.get(this._clientInfo);
        if (typeof window !== 'undefined' && window.navigator) {
            info = readableClientInfo(window.navigator.userAgent);
        }
        if (typeof window !== 'undefined' && window['device'] && window['device'].uuid) {
            uuid = window['device'].uuid;
        }
        this.setClientUuid(uuid);
        this.setClientInfo(info);
        this.clientId = this.storage.get(this._clientId);
        Client.refreshCount = this.storage.get(this._refreshCount) || Client.refreshCountInitial;
    }

    public setClientId(value: string) {
        this.clientId = '' + value;
        this.storage.set(this._clientId, this.clientId);
    }

    public setClientUuid(value: string) {
        this.clientUuid = '' + value;
        this.storage.set(this._clientUuid, this.clientUuid);
    }

    public setClientInfo(value: string) {
        this.clientInfo = '' + value;
        // this.storage.set('clientInfo', this.clientInfo);
    }

    public async status() {
        if (!this.URI) {
            console.error('no api uri');
            throw new FidjError(408, 'no-api-uri');
        }
        try {
            const ajax = new Ajax();
            const status = await ajax.get({
                url: this.URI + '/status',
                headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            });
            if (status.data?.urls?.length) {
                return true;
            }
        } catch (e) {
            /* empty */
        }
        return false;
    }

    // The three tokens a credential sign-in yields. The first is minted with the
    // credential itself — a password or a passkey grant — and the other two
    // with that first token, so the agreement rule applies once, to the
    // person who is present.
    private async mintTokens(
        login: string,
        authorization: string,
        options?: {termsAccepted?: boolean; termsVersion?: string}
    ): Promise<ClientTokens> {
        this.setClientId(login); // login or createdUser.id or createdUser._id
        const urlToken = this.URI + '/apps/' + this.appId + '/tokens';
        const dataToken = {
            grant_type: 'access_token',
            termsAccepted: options?.termsAccepted,
            termsVersion: options?.termsVersion,
            // grant_type: 'client_credentials',
            // client_id: this.clientId,
            // client_secret: password,
            client_udid: this.clientUuid,
            client_info: this.clientInfo,
            // audience: this.appId,
            scope: JSON.stringify(this.sdk),
        };
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authorization,
        };
        const createdAccessToken: ClientToken = (
            await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers,
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })
        ).data.token;

        dataToken.grant_type = 'id_token';
        const createdIdToken: ClientToken = (
            (await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + createdAccessToken.data,
                },
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })) as any
        ).data.token;

        dataToken.grant_type = 'refresh_token';
        const createdRefreshToken: ClientToken = (
            (await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + createdAccessToken.data,
                },
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })) as any
        ).data.token;

        return new ClientTokens(login, createdAccessToken, createdIdToken, createdRefreshToken);
    }

    // A passkey sign-in (v3 P1-4). The browser ran the ceremony against the
    // options and ticket from POST /passkeys/options; the API checks the answer
    // and hands back a short grant that stands in for the password.
    public async loginWithPasskey(
        ticket: string,
        response: any,
        options?: {termsAccepted?: boolean; termsVersion?: string}
    ): Promise<ClientTokens> {
        if (!this.URI) {
            throw new FidjError(408, 'no-api-uri');
        }
        try {
            const signedIn = (
                (await new Ajax().post({
                    url: this.URI + '/passkeys/login',
                    data: {ticket, response},
                    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                    timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
                })) as any
            ).data;
            return await this.mintTokens(signedIn.username, 'Passkey ' + signedIn.grant, options);
        } catch (e: any) {
            if (e instanceof FidjError) {
                throw e;
            }
            const code = typeof e?.code === 'number' ? e.code : 500;
            const body = e?.message;
            throw new FidjError(
                code,
                (typeof body?.message === 'string' && body.message) || 'passkey-login-failed',
                body && typeof body === 'object' ? body : undefined
            );
        }
    }

    public async login(
        login: string,
        password: string,
        updateProperties?: any,
        options?: {autoSignup?: boolean; termsAccepted?: boolean; termsVersion?: string}
    ): Promise<ClientTokens> {
        if (!this.URI) {
            console.error('no api uri');
            throw new FidjError(408, 'no-api-uri');
        }

        try {
            const urlLogin = this.URI + '/users';

            const dataLogin: any = {
                name: login,
                username: login,
                email: login,
                password: password,
            };
            if (options?.autoSignup === false) {
                dataLogin.autoSignup = false;
            }

            const account = (await new Ajax().post({
                url: urlLogin,
                data: dataLogin,
                headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })) as any;
            // Creating an account never signs anybody in: the account exists, the
            // verification link is on its way, and the session waits for it to be
            // opened. 201 is the API saying it created this account just now; 202
            // is an account that was already there and whose password matched. So
            // no policy is needed and no existing account is affected — verified
            // or not, none of them is being created here.
            if (account?.status === 201) {
                throw new FidjError(403, 'verification-required', {email: login});
            }
            const createdUser: ClientUser = account.data.user;

            return await this.mintTokens(
                login,
                'Basic ' + tools.Base64.encode('' + login + ':' + password),
                options
            );
        } catch (e: any) {
            this.logger.warn('Login impossible', e);
            // A refusal raised here already says what it means. Rebuilding it
            // would cost its details — which is how the agreement carried by a
            // 409 was lost before any caller could see it.
            if (e instanceof FidjError) {
                throw e;
            }
            // Rethrow with the HTTP status from Ajax/XhrErrorInterface so callers can react (401 vs 400 vs network).
            const code = typeof e?.code === 'number' ? e.code : 500;
            const reason =
                (typeof e?.message === 'string' && e.message) ||
                (typeof e?.message?.status === 'string' && e.message.status) ||
                (typeof e?.message?.message === 'string' && e.message.message) ||
                (typeof e?.reason === 'string' && e.reason) ||
                'login-failed';
            // The API's own answer, kept whole. Ajax puts it in `message`.
            const body = e?.message;
            throw new FidjError(code, reason, body && typeof body === 'object' ? body : undefined);
        }
    }

    /**
     *
     * @param refreshToken
     * @throws ErrorInterface
     */
    public async reAuthenticate(refreshToken: string) {
        if (!this.URI) {
            console.error('no api uri');
            return Promise.reject({code: 408, reason: 'no-api-uri'});
        }

        const urlToken = this.URI + '/apps/' + this.appId + '/tokens';
        const dataToken = {
            grant_type: 'access_token',
            // client_id: this.clientId,
            client_udid: this.clientUuid,
            client_info: this.clientInfo,
            // audience: this.appId,
            scope: JSON.stringify(this.sdk),
            refresh_token: refreshToken,
            refreshCount: Client.refreshCount,
        };

        const createdAccessToken: ClientToken = (
            await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + refreshToken,
                },
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })
        ).data.token;

        dataToken.grant_type = 'id_token';
        const createdIdToken: ClientToken = (
            (await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + createdAccessToken.data,
                },
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })) as any
        ).data.token;

        Client.refreshCount++;
        this.storage.set(this._refreshCount, Client.refreshCount);

        return {createdAccessToken, createdIdToken};
    }

    public async logout(refreshToken?: string): Promise<void | ErrorInterface> {
        if (!this.URI) {
            console.error('no api uri');
            return Promise.reject({code: 408, reason: 'no-api-uri'});
        }

        // delete this.clientUuid;
        // delete this.clientId;
        // this.storage.remove(this._clientUuid);
        this.storage.remove(this._clientId);
        this.storage.remove(this._refreshCount);
        Client.refreshCount = Client.refreshCountInitial;

        if (!refreshToken || !this.clientId) {
            return Promise.resolve();
        }

        const urlToken = this.URI + '/apps/' + this.appId + '/tokens';

        return (
            await new Ajax().delete({
                url: urlToken,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: 'Bearer ' + refreshToken,
                },
                // Beside the headers, never inside them: a request header named
                // `timeout` is not on the API's allowlist, so the browser's
                // preflight refused the whole call and signing out never
                // reached the server.
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            })
        ).data;
    }

    public isReady(): boolean {
        return !!this.URI || !this._clientId;
    }
}
