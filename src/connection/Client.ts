import {Ajax} from './Ajax';
import * as tools from '../tools';
import {LocalStorage} from '../tools';
import {ErrorInterface, FidjError, LoggerInterface, SdkInterface} from '../sdk';
import {ClientTokens} from './ClientTokens';
import {ClientUser} from './ClientUser';
import {ClientToken} from './ClientToken';

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

    constructor(private appId: string,
                private URI: string,
                private storage: LocalStorage,
                private sdk: SdkInterface,
                private logger: LoggerInterface) {


        this._clientUuid = 'v2.clientUuid.' + appId;
        this._clientId = 'v2.clientId.' + appId;
        this._refreshCount = 'v2.refreshCount.' + appId;

        let uuid: string = this.storage.get(this._clientUuid) || 'uuid-' + Math.random();
        let info = '_clientInfo'; // this.storage.get(this._clientInfo);
        if (typeof window !== 'undefined' && window.navigator) {
            info = window.navigator.appName + '@' + window.navigator.appVersion + '-' + window.navigator.userAgent;
        }
        if (typeof window !== 'undefined' && window['device'] && window['device'].uuid) {
            uuid = window['device'].uuid;
        }
        this.setClientUuid(uuid);
        this.setClientInfo(info);
        this.clientId = this.storage.get(this._clientId);
        Client.refreshCount = this.storage.get(this._refreshCount) || Client.refreshCountInitial;
    };

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

    public async login(login: string, password: string, updateProperties?: any): Promise<ClientTokens> {

        if (!this.URI) {
            console.error('no api uri');
            throw new FidjError(408, 'no-api-uri');
        }

        try {
            const urlLogin = this.URI + '/users';

            const dataLogin = {
                name: login,
                username: login,
                email: login,
                password: password
            };

            const createdUser: ClientUser = (await new Ajax().post({
                url: urlLogin,
                data: dataLogin,
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
            }) as any).data.user;

            this.setClientId(login); // login or createdUser.id or createdUser._id
            const urlToken = this.URI + '/apps/' + this.appId + '/tokens';
            const dataToken = {
                grant_type: 'access_token',
                // grant_type: 'client_credentials',
                // client_id: this.clientId,
                // client_secret: password,
                client_udid: this.clientUuid,
                client_info: this.clientInfo,
                // audience: this.appId,
                scope: JSON.stringify(this.sdk)
            };
            let headers = {
                'Content-Type': 'application/json', 'Accept': 'application/json',
                'Authorization': 'Basic ' + tools.Base64.encode('' + login + ':' + password)
            };
            const createdAccessToken: ClientToken = (await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers
            })).data.token;

            dataToken.grant_type = 'id_token';
            const createdIdToken: ClientToken = (await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers: {
                    'Content-Type': 'application/json', 'Accept': 'application/json',
                    'Authorization': 'Bearer ' + createdAccessToken.data
                }
            }) as any).data.token;

            dataToken.grant_type = 'refresh_token';
            const createdRefreshToken: ClientToken = (await new Ajax().post({
                url: urlToken,
                data: dataToken,
                headers: {
                    'Content-Type': 'application/json', 'Accept': 'application/json',
                    'Authorization': 'Bearer ' + createdAccessToken.data
                }
            }) as any).data.token;

            return new ClientTokens(login, createdAccessToken, createdIdToken, createdRefreshToken);
        } catch (e) {
            this.logger.warn('Login impossible', e);
            return null;
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

        const createdAccessToken: ClientToken = (await new Ajax().post({
            url: urlToken,
            data: dataToken,
            headers: {
                'Content-Type': 'application/json', 'Accept': 'application/json',
                'Authorization': 'Bearer ' + refreshToken
            }
        })).data.token;

        dataToken.grant_type = 'id_token';
        const createdIdToken: ClientToken = (await new Ajax().post({
            url: urlToken,
            data: dataToken,
            headers: {
                'Content-Type': 'application/json', 'Accept': 'application/json',
                'Authorization': 'Bearer ' + createdAccessToken.data
            }
        }) as any).data.token;

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

        return (await new Ajax().delete({
            url: urlToken,
            headers: {
                'Content-Type': 'application/json', 'Accept': 'application/json',
                'Authorization': 'Bearer ' + refreshToken
            }
        })).data;
    }

    public isReady(): boolean {
        return !!this.URI;
    }
}
