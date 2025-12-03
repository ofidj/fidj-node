import {Client} from './Client';
import {
    EndpointInterface,
    ErrorInterface,
    FidjError,
    FidjNodeService,
    LoggerInterface,
    ModuleServiceLoginOptionsInterface,
    SdkInterface,
} from '../sdk';
import {Base64, LocalStorage, Xor} from '../tools';
import {Ajax} from './Ajax';
import {ConnectionFindOptionsInterface} from './Interfaces';
import {ClientUser} from './ClientUser';
import {ClientTokens} from './ClientTokens';
import {ClientToken} from './ClientToken';

export class Connection {
    public fidjId: string;
    public fidjVersion: string;
    public fidjCrypto: boolean;
    private _accessToken: string;
    private _accessTokenPrevious: string;
    private _idToken: string;
    private _refreshToken: string;
    private _states: string;
    private _cryptoSalt: string;
    private _cryptoSaltNext: string;
    private accessToken: string;
    private accessTokenPrevious: string;
    private idToken: string;
    private refreshToken: string;
    private states: {[s: string]: {state: boolean; time: number; lastTimeWasOk: number}}; // Map<string, boolean>;
    private apis: Array<EndpointInterface>;
    private cryptoSalt: string;
    private cryptoSaltNext: string;
    private client: Client;
    private user: ClientUser;

    constructor(
        private _sdk: SdkInterface,
        private _storage: LocalStorage,
        private _logger: LoggerInterface
    ) {
        this.client = null;
        this.user = null;
    }

    isReady(): boolean {
        return !!this.client && this.client.isReady();
    }

    async init(fidjVersion: string, fidjId: string, fidjCrypto: boolean) {
        this.fidjId = fidjId;
        this.fidjVersion = fidjVersion;
        this.fidjCrypto = fidjCrypto;

        this._accessToken = 'v2.accessToken.' + this.fidjId;
        this._accessTokenPrevious = 'v2.accessTokenPrevious.' + this.fidjId;
        this._idToken = 'v2.idToken.' + this.fidjId;
        this._refreshToken = 'v2.refreshToken.' + this.fidjId;
        this._states = 'v2.states.' + this.fidjId;
        this._cryptoSalt = 'v2.cryptoSalt.' + this.fidjId;
        this._cryptoSaltNext = 'v2.cryptoSalt.next.' + this.fidjId;

        this.cryptoSalt = this._storage.get(this._cryptoSalt) || null;
        this.cryptoSaltNext = this._storage.get(this._cryptoSaltNext) || null;
        this.accessToken = this._storage.get(this._accessToken) || null;
        this.accessTokenPrevious = this._storage.get(this._accessTokenPrevious) || null;
        this.idToken = this._storage.get(this._idToken) || null;
        this.refreshToken = this._storage.get(this._refreshToken) || null;
        this.states = this._storage.get(this._states) || {};
        this.apis = [];
    }

    async destroy(force?: boolean) {
        this._storage.remove(this._accessToken);
        this._storage.remove(this._idToken);
        this._storage.remove(this._refreshToken);
        this._storage.remove(this._states);

        if (this.accessToken) {
            this.accessTokenPrevious = this.accessToken;
            this._storage.set(this._accessTokenPrevious, this.accessTokenPrevious);
        }

        if (force) {
            this._storage.remove(this._cryptoSalt);
            this._storage.remove(this._cryptoSaltNext);
            this._storage.remove(this._accessTokenPrevious);
        }

        this.user = null;
        if (this.client) {
            // this.client.setClientId(null);
            await this.client.logout();
        }
        this.accessToken = null;
        this.idToken = null;
        this.refreshToken = null;
        this.states = {}; // new Map<string, boolean>();
    }

    setClient(client: Client): void {
        this.client = client;
        // if (!this.user) {
        //     this.user = new ClientUser();
        // }
        //  this._user._id = this._client.clientId;
        // this.user._name = JSON.parse(this.getIdPayload({name: ''})).name;
    }

    setUser(user: ClientUser): void {
        this.user = user;
        if (this.client && this.user.id) {
            this.client.setClientId(this.user.id);

            // store only clientId
            // delete this.user._id;
        }
    }

    getUser(): ClientUser {
        return this.user;
    }

    getClient(): Client {
        return this.client;
    }

    setCryptoSalt(value: string) {
        if (this.cryptoSalt !== value && this.cryptoSaltNext !== value) {
            this.cryptoSaltNext = value;
            this._storage.set(this._cryptoSaltNext, this.cryptoSaltNext);
        }

        if (!this.cryptoSalt) {
            this.setCryptoSaltAsVerified();
        }
    }

    setCryptoSaltAsVerified() {
        if (this.cryptoSaltNext) {
            this.cryptoSalt = this.cryptoSaltNext;
            this._storage.set(this._cryptoSalt, this.cryptoSalt);
        }
        this.cryptoSaltNext = null;
        this._storage.remove(this._cryptoSaltNext);
    }

    encrypt(data: any): string {
        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        } else {
            const dataAsObj = {string: data};
            data = JSON.stringify(dataAsObj);
        }

        if (this.fidjCrypto && this.cryptoSalt) {
            const key = this.cryptoSalt;
            return Xor.encrypt(data, key);
        } else {
            return data;
        }
    }

    decrypt(data: string): any {
        let decrypted = null;

        try {
            if (this.fidjCrypto && this.cryptoSaltNext) {
                const key = this.cryptoSaltNext;
                decrypted = Xor.decrypt(data, key);
                decrypted = JSON.parse(decrypted);
                // if (decrypted) {
                //    this.setCryptoSaltAsVerified();
                // }
            }
        } catch (err) {
            decrypted = null;
        }

        try {
            if (!decrypted && this.fidjCrypto && this.cryptoSalt) {
                const key = this.cryptoSalt;
                decrypted = Xor.decrypt(data, key);
                decrypted = JSON.parse(decrypted);
            }
        } catch (err) {
            decrypted = null;
        }

        try {
            if (!decrypted && this.fidjCrypto && this.cryptoSalt) {
                const key = this.cryptoSalt;
                decrypted = Xor.decrypt(data, key, true);
                decrypted = JSON.parse(decrypted);
            }
        } catch (err) {
            decrypted = null;
        }

        try {
            if (!decrypted) {
                decrypted = JSON.parse(data);
            }

            if (decrypted && decrypted.string) {
                decrypted = decrypted.string;
            }
        } catch (err) {
            decrypted = null;
        }

        return decrypted;
    }

    isLogin(): boolean {
        let exp = true;
        try {
            const payload = this.refreshToken.split('.')[1];
            const decoded = JSON.parse(Base64.decode(payload));
            exp = new Date().getTime() / 1000 >= decoded.exp;
        } catch (e) {
            // If there's an error parsing the token, keep exp as true (not logged in)
        }
        return !exp;
    }

    isConnected() {
        return this.client?.status();
    }

    // todo reintegrate client.login()

    async logout(): Promise<void | ErrorInterface> {
        return this.getClient().logout(this.refreshToken);
    }

    getClientId(): string {
        if (!this.client) {
            return null;
        }
        return this.client.clientId;
    }

    async getIdToken() {
        return this.idToken;
    }

    async getIdPayload(def?: any) {
        const idToken = await this.getIdToken();

        try {
            let payload;
            if (idToken) {
                payload = idToken.split('.')[1];
            }
            if (payload) {
                return Base64.decode(payload);
            }
        } catch (e) {
            this._logger.log('fidj.connection.getIdPayload pb: ', def, e);
        }

        if (def) {
            if (typeof def !== 'string') {
                def = JSON.stringify(def);
            }
            return def;
        }

        return null;
    }

    async getAccessPayload(def?: any): Promise<string> {
        if (def && typeof def !== 'string') {
            def = JSON.stringify(def);
        }

        try {
            const payload = this.accessToken.split('.')[1];
            if (payload) {
                return Base64.decode(payload);
            }
        } catch (e) {
            // If there's an error parsing the token, return the default value
        }
        return def ? def : null;
    }

    getPreviousAccessPayload(def?: any): string {
        if (def && typeof def !== 'string') {
            def = JSON.stringify(def);
        }

        try {
            const payload = this.accessTokenPrevious.split('.')[1];
            if (payload) {
                return Base64.decode(payload);
            }
        } catch (e) {
            // If there's an error parsing the previous token, return the default value
        }
        return def ? def : null;
    }

    /**
     * @throws ErrorInterface
     */
    async refreshConnection(force = false) {
        if (force) {
            this.removingCurrentTokens();
        }

        // token not expired : ok
        if (this.accessToken) {
            const payload = this.accessToken.split('.')[1];
            const decoded = Base64.decode(payload);
            const notExpired = new Date().getTime() / 1000 < JSON.parse(decoded).exp;
            // console.log('new Date().getTime() < JSON.parse(decoded).exp :', (new Date().getTime() / 1000), JSON.parse(decoded).exp);
            this._logger.log(
                'fidj.connection.connection.refreshConnection : token not expired ? ',
                notExpired
            );
            if (notExpired) {
                return this.updatedClientTokens();
            }
        }

        // remove expired refreshToken
        if (this.refreshToken) {
            const payload = this.refreshToken.split('.')[1];
            const decoded = Base64.decode(payload);
            const expired = new Date().getTime() / 1000 >= JSON.parse(decoded).exp;
            this._logger.log(
                'fidj.connection.connection.refreshConnection : refreshToken not expired ? ',
                expired
            );
            if (expired) {
                this._storage.remove(this._refreshToken);
            }
        }

        // remove expired accessToken & idToken & store it as Previous one
        this.removingCurrentTokens();

        // refresh authentication
        this._logger.log('fidj.connection.connection.refreshConnection : refresh authentication.');
        const client = this.getClient();
        if (!client) {
            throw new FidjError(400, 'Need an initialized client.');
        }

        const {createdAccessToken, createdIdToken} = await this.client.reAuthenticate(
            this.refreshToken
        );
        this.accessToken = createdAccessToken.data;
        this.idToken = createdIdToken.data;

        return this.updatedClientTokens();
    }

    async setConnection(clientTokens: ClientTokens) {
        if (!clientTokens) {
            return;
        }

        // only in private storage
        if (clientTokens.accessToken) {
            this.accessToken = clientTokens.accessToken.data;
            this._storage.set(this._accessToken, this.accessToken);

            const salt: string = JSON.parse(await this.getAccessPayload({salt: ''})).salt;
            if (salt) {
                this.setCryptoSalt(salt);
            }
        }
        if (clientTokens.idToken) {
            this.idToken = clientTokens.idToken.data;
            this._storage.set(this._idToken, this.idToken);
        }
        if (clientTokens.refreshToken) {
            this.refreshToken = clientTokens.refreshToken.data;
            this._storage.set(this._refreshToken, this.refreshToken);
        }

        // store changed states
        this._storage.set(this._states, this.states);

        // expose roles, message
        const clientUser = new ClientUser(
            clientTokens.username,
            clientTokens.username,
            JSON.parse(await this.getIdPayload({roles: []})).roles
        );
        this.setUser(clientUser);
    }

    async setConnectionOffline(options: ModuleServiceLoginOptionsInterface) {
        if (options.accessToken) {
            this.accessToken = options.accessToken;
            this._storage.set(this._accessToken, this.accessToken);
        }
        if (options.idToken) {
            this.idToken = options.idToken;
            this._storage.set(this._idToken, this.idToken);
        }
        if (options.refreshToken) {
            this.refreshToken = options.refreshToken;
            this._storage.set(this._refreshToken, this.refreshToken);
        }

        this.setUser(
            new ClientUser('demo', 'demo', JSON.parse(await this.getIdPayload({roles: []})).roles)
        );
    }

    async getApiEndpoints(
        options?: ConnectionFindOptionsInterface
    ): Promise<Array<EndpointInterface>> {
        let ea: EndpointInterface[] = [
            {key: 'fidj.default', url: 'https://api.fidj.ovh/v3', blocked: false},
        ];
        let filteredEa = [];

        if (!this._sdk.prod) {
            ea = [
                {key: 'fidj.default', url: 'http://localhost:3201/v3', blocked: false},
                {key: 'fidj.default', url: 'https://api.sandbox.fidj.ovh/v3', blocked: false},
            ];
        }

        if (this.accessToken) {
            const val = await this.getAccessPayload({apis: []});
            const apiEndpoints: EndpointInterface[] = JSON.parse(val).apis;
            if (apiEndpoints && apiEndpoints.length) {
                ea = [];
                apiEndpoints.forEach((endpoint) => {
                    if (endpoint.url) {
                        ea.push(endpoint);
                    }
                });
            }
        }

        if (this.accessTokenPrevious) {
            const apiEndpoints: EndpointInterface[] = JSON.parse(
                this.getPreviousAccessPayload({apis: []})
            ).apis;
            if (apiEndpoints && apiEndpoints.length) {
                apiEndpoints.forEach((endpoint) => {
                    if (endpoint.url && ea.filter((r) => r.url === endpoint.url).length === 0) {
                        ea.push(endpoint);
                    }
                });
            }
        }

        this._logger.log('fidj.sdk.connection.getApiEndpoints : ', ea, this.states);

        let couldCheckStates = true;
        if (this.states && Object.keys(this.states).length) {
            for (let i = 0; i < ea.length && couldCheckStates; i++) {
                if (!this.states[ea[i].url]) {
                    couldCheckStates = false;
                }
            }
        } else {
            couldCheckStates = false;
        }

        if (options?.filter) {
            if (couldCheckStates && options.filter === 'theBestOne') {
                for (let i = 0; i < ea.length && filteredEa.length === 0; i++) {
                    const endpoint = ea[i];
                    if (this.states[endpoint.url] && this.states[endpoint.url].state) {
                        filteredEa.push(endpoint);
                    }
                }
            } else if (couldCheckStates && options.filter === 'theBestOldOne') {
                let bestOldOne: EndpointInterface;
                for (let i = 0; i < ea.length; i++) {
                    const endpoint = ea[i];
                    if (
                        this.states[endpoint.url] &&
                        this.states[endpoint.url].lastTimeWasOk &&
                        (!bestOldOne ||
                            this.states[endpoint.url].lastTimeWasOk >
                                this.states[bestOldOne.url].lastTimeWasOk)
                    ) {
                        bestOldOne = endpoint;
                    }
                }
                if (bestOldOne) {
                    filteredEa.push(bestOldOne);
                }
            } else if (ea.length) {
                filteredEa.push(ea[0]);
            }
        } else {
            filteredEa = ea;
        }

        return filteredEa;
    }

    async getDBs(options?: ConnectionFindOptionsInterface): Promise<EndpointInterface[]> {
        if (!this.accessToken) {
            return [];
        }

        // todo test random DB connection
        const random = Math.random() % 2;
        let dbs = JSON.parse(await this.getAccessPayload({dbs: []})).dbs || [];

        // need to synchronize db
        if (random === 0) {
            dbs = dbs.sort();
        } else if (random === 1) {
            dbs = dbs.reverse();
        }

        let filteredDBs = [];
        let couldCheckStates = true;
        if (this.states && Object.keys(this.states).length) {
            for (let i = 0; i < dbs.length && couldCheckStates; i++) {
                if (!this.states[dbs[i].url]) {
                    couldCheckStates = false;
                }
            }
        } else {
            couldCheckStates = false;
        }

        if (couldCheckStates && options && options.filter === 'theBestOne') {
            for (let i = 0; i < dbs.length && filteredDBs.length === 0; i++) {
                const endpoint = dbs[i];
                if (this.states[endpoint.url] && this.states[endpoint.url].state) {
                    filteredDBs.push(endpoint);
                }
            }
        } else if (couldCheckStates && options && options.filter === 'theBestOnes') {
            for (let i = 0; i < dbs.length; i++) {
                const endpoint = dbs[i];
                if (this.states[endpoint.url] && this.states[endpoint.url].state) {
                    filteredDBs.push(endpoint);
                }
            }
        } else if (options && options.filter === 'theBestOne' && dbs.length) {
            filteredDBs.push(dbs[0]);
        } else {
            filteredDBs = dbs;
        }

        return filteredDBs;
    }

    async verifyConnectionStates(): Promise<any | ErrorInterface> {
        const currentTime = new Date().getTime();

        // todo need verification ? not yet (cache)
        // if (Object.keys(this.states).length > 0) {
        //     const time = this.states[Object.keys(this.states)[0]].time;
        //     if (currentTime < time) {
        //         return Promise.resolve();
        //     }
        // }

        // verify via GET status on Endpoints & DBs
        this.states = {};
        this.apis = await this.getApiEndpoints();
        for (const api of this.apis) {
            let endpointUrl: string = api.url;
            if (!endpointUrl) {
                endpointUrl = api.toString();
            }
            const verified = await this.verifyApiState(currentTime, endpointUrl);
        }

        const dbs = await this.getDBs();
        for (const db of dbs) {
            let dbEndpoint: string = db.url;
            if (!dbEndpoint) {
                dbEndpoint = db.toString();
            }
            const verified = await this.verifyDbState(currentTime, dbEndpoint);
        }
    }

    protected async updatedClientTokens() {
        const accessToken = new ClientToken(this.getClientId(), 'accessToken', this.accessToken);
        const idToken = new ClientToken(this.getClientId(), 'idToken', this.idToken);
        const refreshToken = new ClientToken(this.getClientId(), 'refreshToken', this.refreshToken);
        const clientTokens = new ClientTokens(
            this.getClientId(),
            accessToken,
            idToken,
            refreshToken
        );
        await this.setConnection(clientTokens);
        return clientTokens;
    }

    protected removingCurrentTokens() {
        if (this.accessToken) {
            this.accessTokenPrevious = this.accessToken;
            this._storage.set(this._accessTokenPrevious, this.accessTokenPrevious);
        }

        this._storage.remove(this._accessToken);
        this._storage.remove(this._idToken);
        this.accessToken = null;
        this.idToken = null;
    }

    private async verifyApiState(currentTime: number, endpointUrl: string) {
        try {
            this._logger.log('fidj.sdk.connection.verifyApiState : ', currentTime, endpointUrl);

            const data = (
                await new Ajax().get({
                    url: endpointUrl + '/status?isOk=' + this._sdk.version,
                    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                    timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
                })
            ).data;

            let state = false;
            if (data && data.isOk) {
                state = true;
            }
            this.states[endpointUrl] = {
                state: state,
                time: currentTime,
                lastTimeWasOk: currentTime,
            };

            this._logger.log('fidj.sdk.connection.verifyApiState > states : ', this.states);
        } catch (err) {
            this._logger.log(
                'fidj.sdk.connection.verifyApiState > catch pb  - states : ',
                endpointUrl
            );
            let lastTimeWasOk = 0;
            if (this.states[endpointUrl]) {
                lastTimeWasOk = this.states[endpointUrl].lastTimeWasOk;
            }
            this.states[endpointUrl] = {
                state: false,
                time: currentTime,
                lastTimeWasOk: lastTimeWasOk,
            };
        }

        // store states
        this._storage.set(this._states, this.states);
    }

    private async verifyDbState(currentTime: number, dbEndpoint: string) {
        try {
            // console.log('verifyDbState: ', dbEndpoint);
            await new Ajax().get({
                url: dbEndpoint,
                headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                timeout: FidjNodeService.DEFAULT_TIMEOUT_MS,
            });

            this.states[dbEndpoint] = {state: true, time: currentTime, lastTimeWasOk: currentTime};
            // resolve();
            // console.log('verifyDbState: state', dbEndpoint, true);
        } catch (err) {
            let lastTimeWasOk = 0;
            if (this.states[dbEndpoint]) {
                lastTimeWasOk = this.states[dbEndpoint].lastTimeWasOk;
            }
            this.states[dbEndpoint] = {
                state: false,
                time: currentTime,
                lastTimeWasOk: lastTimeWasOk,
            };
            // resolve();
        }

        // store states
        this._storage.set(this._states, this.states);
    }
}
