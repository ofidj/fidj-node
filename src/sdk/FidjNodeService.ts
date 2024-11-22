// import PouchDB from 'pouchdb';
// import * as PouchDB from 'pouchdb/dist/pouchdb.js';
// import PouchDB from 'pouchdb/dist/pouchdb.js';
import {Fidj} from '../module';
import * as tools from '../tools';
import * as connection from '../connection';
import {Ajax, ClientTokens, ClientUser} from '../connection';
import * as session from '../session';
import {SessionCryptoInterface} from '../session';
import {
    EndpointCallInterface,
    EndpointFilterInterface,
    EndpointInterface,
    ErrorInterface,
    LoggerInterface,
    LoggerLevelEnum,
    ModuleServiceInitOptionsInterface,
    ModuleServiceLoginOptionsInterface,
    SdkInterface
} from './interfaces';
import {LoggerService} from './logger.service';
import urlJoin from 'proper-url-join';
import {FidjError} from './error';
// import {LocalStorage} from 'node-localstorage';
// import 'localstorage-polyfill/localStorage';

// const PouchDB = window['PouchDB'] || require('pouchdb').default;

/**
 * please use its angular.js or angular.io wrapper
 * usefull only for fidj dev team
 */
export class FidjNodeService {

    private static _srvDataUniqId = 0;
    private sdk: SdkInterface;
    private logger: LoggerInterface;
    private promise: PromiseConstructor;
    private storage: tools.LocalStorage;
    private session: session.Session;
    private connection: connection.Connection;

    constructor(logger?: LoggerInterface, promise?: PromiseConstructor, options?: ModuleServiceInitOptionsInterface) {

        this.sdk = {
            org: 'fidj',
            version: Fidj.version.substring(1),
            prod: false,
            useDB: true
        };
        if (promise) {
            this.promise = promise;
        } else {
            this.promise = Promise;
        }
        if (logger) {
            this.logger = logger;
        } else {
            this.logger = new LoggerService();
        }
        if (options && options.logLevel) {
            this.logger.setLevel(options.logLevel);
        }

        this.logger.log('fidj.sdk.service : constructor');

        this.storage = new tools.LocalStorage('fidj.');
        this.session = new session.Session();
        this.connection = new connection.Connection(this.sdk, this.storage, this.logger);
    }


    static IsJWTExpired(payload: any): boolean {
        if (!payload.exp) {
            return true;
        }

        const now = new Date();
        const expDate = new Date(payload.exp * 1000);
        return (expDate.getTime() < now.getTime());
    }

    static NameFromPayload(payload: any): string {
        return payload?.name;
    }

    static RolesFromPayload(payload: any): string[] {
        let roles = [];
        try {
            roles = [].concat(payload.roles);
        } catch (ignored) {
        }

        return roles;
    }

    static AppIdFromPayload(payload: any): string {
        return payload?.aud;
    }

    /**
     * Init connection & session
     * Check uri
     * Done each app start
     *
     * @param fidjId
     * @param options Optional settings
     * @param options.fidjId  required use your customized endpoints
     * @param options.fidjSalt required use your customized endpoints
     * @param options.fidjVersion required use your customized endpoints
     * @param options.devMode optional default false, use your customized endpoints
     * @returns
     * @throws {ErrorInterface}
     */
    public async fidjInit(fidjId: string, options?: ModuleServiceInitOptionsInterface): Promise<void> {

        /*if (options && options.forcedEndpoint) {
            this.fidjService.setAuthEndpoint(options.forcedEndpoint);
        }
        if (options && options.forcedDBEndpoint) {
            this.fidjService.setDBEndpoint(options.forcedDBEndpoint);
        }*/
        if (options && options.logLevel) {
            this.logger.setLevel(options.logLevel);
        } else {
            this.logger.setLevel(LoggerLevelEnum.NONE);
        }

        this.logger.log('fidj.sdk.service.fidjInit : ', options);
        if (!fidjId) {
            this.logger.error('fidj.sdk.service.fidjInit : bad init');
            return this.promise.reject(new FidjError(400, 'Need a fidjId'));
        }

        this.sdk.prod = !options ? true : options.prod;
        this.sdk.useDB = !options ? false : options.useDB;
        this.connection.fidjId = fidjId;
        this.connection.fidjVersion = this.sdk.version;
        this.connection.fidjCrypto = (!options || !options.hasOwnProperty('crypto')) ? false : options.crypto;

        let bestUrls, bestOldUrls;
        try {
            await this.connection.verifyConnectionStates();
            bestUrls = await this.connection.getApiEndpoints({filter: 'theBestOne'});
            bestOldUrls = await this.connection.getApiEndpoints({filter: 'theBestOldOne'});
        } catch (err) {
            this.logger.error('fidj.sdk.service.fidjInit: ', err);
            throw new FidjError(500, err.toString());
        }

        if (!bestUrls || !bestOldUrls || (bestUrls.length === 0 && bestOldUrls.length === 0)) {
            throw new FidjError(404, 'Need one connection - or too old SDK version (check update)');
        }

        let theBestFirstUrl = bestUrls[0];
        let theBestFirstOldUrl = bestOldUrls[0];
        const isLogin = this.fidjIsLogin();
        this.logger.log('fidj.sdk.service.fidjInit > verifyConnectionStates : ', theBestFirstUrl, theBestFirstOldUrl, isLogin);

        if (theBestFirstUrl) {
            this.connection.setClient(new connection.Client(this.connection.fidjId, theBestFirstUrl.url, this.storage, this.sdk, this.logger));
        } else {
            this.connection.setClient(new connection.Client(this.connection.fidjId, theBestFirstOldUrl.url, this.storage, this.sdk, this.logger));
        }
    };

    /**
     * Call it if fidjIsLogin() === false
     * Erase all (db & storage)
     *
     * @param login
     * @param password
     * @throws {ErrorInterface}
     */
    public async fidjLogin(login: string, password: string): Promise<ClientUser> {
        this.logger.log('fidj.sdk.service.fidjLogin');
        if (!this.connection.isReady()) {
            throw new FidjError(404, 'Need an initialized FidjService');
        }

        try {
            await this._removeAll();
            await this.connection.verifyConnectionStates();
            await this._createSession(this.connection.fidjId);
            const clientTokens = await this._loginInternal(login, password);
            await this.connection.setConnection(clientTokens);
        } catch (err) {
            throw new FidjError(500, err.toString());
        }

        if (!this.sdk.useDB) {
            return this.connection.getUser();
        }

        try {
            await this.session.sync(this.connection.getClientId());
        } catch (e) {
            this.logger.warn('fidj.sdk.service.fidjLogin: sync -not blocking- issue  ', e.toString());
        }
        return this.connection.getUser();
    }

    /**
     *
     * @param options
     * @param options.accessToken optional
     * @param options.idToken  optional
     * @returns
     */
    public async fidjLoginInDemoMode(options?: ModuleServiceLoginOptionsInterface): Promise<any | ErrorInterface> {
        const self = this;

        // generate one day tokens if not set
        if (!options || !options.accessToken) {
            const now = new Date();
            now.setDate(now.getDate() + 1);
            const tomorrow = now.getTime();
            const payload = tools.Base64.encode(JSON.stringify({
                roles: [],
                message: 'demo',
                apis: [],
                endpoints: [],
                dbs: [],
                exp: tomorrow
            }));
            const jwtSign = tools.Base64.encode(JSON.stringify({}));
            const token = jwtSign + '.' + payload + '.' + jwtSign;
            options = {
                accessToken: token,
                idToken: token,
                refreshToken: token
            };
        }

        return new self.promise((resolve, reject) => {
            self._removeAll()
                .then(() => {
                    return self._createSession(self.connection.fidjId);
                })
                .then(async () => {
                    await self.connection.setConnectionOffline(options);
                    resolve(self.connection.getUser());
                })
                .catch((err) => {
                    self.logger.error('fidj.sdk.service.fidjLoginInDemoMode error: ', err);
                    reject(err);
                });
        });
    };

    public fidjIsLogin(): boolean {
        return this.connection.isLogin();
    };

    public async fidjGetEndpoints(filter?: EndpointFilterInterface): Promise<Array<EndpointInterface>> {

        if (!filter) {
            filter = {showBlocked: false};
        }
        const ap = await this.connection.getAccessPayload({endpoints: []});
        let endpoints = JSON.parse(ap).endpoints;
        if (!endpoints || !Array.isArray(endpoints)) {
            return [];
        }

        endpoints = endpoints.filter((endpoint: EndpointInterface) => {
            let ok = true;
            if (ok && filter.key) {
                ok = (endpoint.key === filter.key);
            }
            if (ok && !filter.showBlocked) {
                ok = !endpoint.blocked;
            }
            return ok;
        });
        return endpoints;
    };

    public async fidjRoles(): Promise<Array<any>> {
        return JSON.parse(await this.connection.getIdPayload({roles: []})).roles;
    };

    public async fidjMessage(): Promise<string> {
        return JSON.parse(await this.connection.getIdPayload({message: ''})).message;
    };

    public async fidjLogout(force?: boolean): Promise<void | ErrorInterface> {
        const self = this;
        if (!self.connection.getClient() && !force) {
            return self._removeAll()
                .then(() => {
                    return this.session.create(self.connection.fidjId, true);
                });
        }

        return self.connection.logout()
            .then(() => {
                return self._removeAll();
            })
            .catch(() => {
                return self._removeAll();
            })
            .then(() => {
                return this.session.create(self.connection.fidjId, true);
            });
    };

    /**
     * Synchronize DB
     *
     *
     * @param fnInitFirstData a function with db as input and that return promise: call if DB is empty
     * @param fnInitFirstData_Arg arg to set to fnInitFirstData()
     * @returns  promise
     */
    public async fidjSync(fnInitFirstData?, fnInitFirstData_Arg?): Promise<void | ErrorInterface> {
        const self = this;
        self.logger.log('fidj.sdk.service.fidjSync');
        // if (!self.session.isReady()) {
        //    return self.promise.reject('fidj.sdk.service.fidjSync : DB sync impossible. Did you login ?');
        // }

        if (!self.sdk.useDB) {
            self.logger.log('fidj.sdk.service.fidjSync: you ar not using DB - no sync available.');
            return Promise.resolve();
        }

        const firstSync = (self.session.dbLastSync === null);

        return new self.promise((resolve, reject) => {

            self._createSession(self.connection.fidjId)
                .then(() => {
                    return self.session.sync(self.connection.getClientId());
                })
                .then(() => {
                    self.logger.log('fidj.sdk.service.fidjSync resolved');
                    return self.session.isEmpty();
                })
                .catch((err) => {
                    self.logger.warn('fidj.sdk.service.fidjSync warn: ', err);
                    return self.session.isEmpty();
                })
                .then((isEmpty) => {
                    self.logger.log('fidj.sdk.service.fidjSync isEmpty : ', isEmpty, firstSync);

                    return new self.promise((resolveEmpty, rejectEmptyNotUsed) => {
                        if (isEmpty && firstSync && fnInitFirstData) {
                            const ret = fnInitFirstData(fnInitFirstData_Arg);
                            if (ret && ret['catch'] instanceof Function) {
                                ret.then(resolveEmpty).catch(reject);
                            }
                            if (typeof ret === 'string') {
                                self.logger.log(ret);
                            }
                        }
                        resolveEmpty(null); // self.connection.getUser());
                    });
                })
                .then((info) => {
                    self.logger.log('fidj.sdk.service.fidjSync fnInitFirstData resolved: ', info);
                    self.session.dbLastSync = new Date().getTime();
                    return self.session.info();
                })
                .then((result: any) => {
                    self.session.dbRecordCount = 0;
                    if (result && result.doc_count) {
                        self.session.dbRecordCount = result.doc_count;
                    }
                    self.logger.log('fidj.sdk.service.fidjSync _dbRecordCount : ' + self.session.dbRecordCount);

                    return self.connection.refreshConnection();
                })
                .then((user) => {
                    self.logger.log('fidj.sdk.service.fidjSync refreshConnection done : ', user);
                    resolve(); // self.connection.getUser()
                })
                .catch((err: ErrorInterface) => {
                    // console.error(err);
                    self.logger.warn('fidj.sdk.service.fidjSync refreshConnection failed : ', err);

                    if (err && (err.code === 403 || err.code === 410)) {
                        this.fidjLogout()
                            .then(() => {
                                reject({code: 403, reason: 'Synchronization unauthorized : need to login again.'});
                            })
                            .catch(() => {
                                reject({code: 403, reason: 'Synchronization unauthorized : need to login again..'});
                            });
                    } else if (err && err.code) {
                        // todo what to do with this err ?
                        resolve();
                    } else {
                        const errMessage = 'Error during synchronisation: ' + err.toString();
                        self.logger.error(errMessage);
                        reject({code: 500, reason: errMessage});
                    }
                })
            ;
        });
    };

    public async fidjPutInDb(data: any): Promise<string | ErrorInterface> {
        const self = this;
        self.logger.log('fidj.sdk.service.fidjPutInDb: ', data);
        if (!self.sdk.useDB) {
            self.logger.log('fidj.sdk.service.fidjPutInDb: you are not using DB - no put available.');
            return Promise.resolve('NA');
        }

        if (!self.connection.getClientId()) {
            return self.promise.reject(new FidjError(401, 'DB put impossible. Need a user logged in.'));
        }
        if (!self.session.isReady()) {
            return self.promise.reject(new FidjError(400, 'Need to be synchronised.'));
        }

        let _id: string;
        if (data && typeof data === 'object' && Object.keys(data).indexOf('_id')) {
            _id = data._id;
        }
        if (!_id) {
            _id = self._generateObjectUniqueId(self.connection.fidjId);
        }
        let crypto: SessionCryptoInterface;
        if (self.connection.fidjCrypto) {
            crypto = {
                obj: self.connection,
                method: 'encrypt'
            }
        }

        return self.session.put(
            data,
            _id,
            self.connection.getClientId(),
            self.sdk.org,
            self.connection.fidjVersion,
            crypto);
    };

    public async fidjRemoveInDb(data_id: string): Promise<void | ErrorInterface> {
        const self = this;
        self.logger.log('fidj.sdk.service.fidjRemoveInDb ', data_id);
        if (!self.sdk.useDB) {
            self.logger.log('fidj.sdk.service.fidjRemoveInDb: you are not using DB - no remove available.');
            return Promise.resolve();
        }

        if (!self.session.isReady()) {
            return self.promise.reject(new FidjError(400, 'Need to be synchronised.'));
        }

        if (!data_id || typeof data_id !== 'string') {
            return self.promise.reject(new FidjError(400, 'DB remove impossible. ' +
                'Need the data._id.'));
        }

        return self.session.remove(data_id);
    };

    public async fidjFindInDb(data_id: string): Promise<any | ErrorInterface> {
        const self = this;

        if (!self.sdk.useDB) {
            self.logger.log('fidj.sdk.service.fidjFindInDb: you are not using DB - no find available.');
            return Promise.resolve();
        }

        if (!self.connection.getClientId()) {
            return self.promise.reject(new FidjError(401, 'Find pb : need a user logged in.'));
        }
        if (!self.session.isReady()) {
            return self.promise.reject(new FidjError(400, ' Need to be synchronised.'));
        }

        let crypto: SessionCryptoInterface;
        if (self.connection.fidjCrypto) {
            crypto = {
                obj: self.connection,
                method: 'decrypt'
            };
        }

        return self.session.get(data_id, crypto);
    };

    public async fidjFindAllInDb(): Promise<Array<any> | ErrorInterface> {
        const self = this;

        if (!self.sdk.useDB) {
            self.logger.log('fidj.sdk.service.fidjFindAllInDb: you are not using DB - no find available.');
            return Promise.resolve([]);
        }

        if (!self.connection.getClientId()) {
            return self.promise.reject(new FidjError(401, 'Need a user logged in.'));
        }
        if (!self.session.isReady()) {
            return self.promise.reject(new FidjError(400, 'Need to be synchronised.'));
        }

        let crypto: SessionCryptoInterface;
        if (self.connection.fidjCrypto) {
            crypto = {
                obj: self.connection,
                method: 'decrypt'
            };
        }

        return self.session.getAll(crypto)
            .then(results => {
                self.connection.setCryptoSaltAsVerified();
                return self.promise.resolve((results as Array<any>));
            });
    };

    public async fidjSendOnEndpoint(input: EndpointCallInterface): Promise<any> {
        const filter: EndpointFilterInterface = input.key ? {key: input.key} : null;
        const endpoints = await this.fidjGetEndpoints(filter);
        if (!input.defaultKeyUrl && (!endpoints || endpoints.length !== 1)) {
            throw new FidjError(400, 'fidj.sdk.service.fidjSendOnEndpoint : endpoint does not exist.');
        }

        let firstEndpointUrl = (!endpoints || endpoints.length !== 1) ? input.defaultKeyUrl : endpoints[0].url;
        if (input.relativePath) {
            firstEndpointUrl = urlJoin(firstEndpointUrl, input.relativePath);
        }
        const jwt = await this.connection.getIdToken();
        let answer;
        const query = new Ajax();
        switch (input.verb) {
            case 'POST' :
                answer = query.post({
                    url: firstEndpointUrl,
                    // not used : withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + jwt
                    },
                    data: input.data ? input.data : {},
                    timeout: input.timeout
                });
                break;
            case 'PUT' :
                answer = query.put({
                    url: firstEndpointUrl,
                    // not used : withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + jwt
                    },
                    data: input.data ? input.data : {},
                    timeout: input.timeout
                });
                break;
            case 'DELETE' :
                answer = query.delete({
                    url: firstEndpointUrl,
                    // not used : withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + jwt
                    },
                    timeout: input.timeout
                    // not used: data: data
                });
                break;
            default:
                answer = query.get({
                    url: firstEndpointUrl,
                    // not used : withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + jwt
                    },
                    timeout: input.timeout
                    // not used: data: data
                });
        }
        return answer;
    };

    public async fidjForgotPasswordRequest(email: String) {

        const bestUrls = await this.connection.getApiEndpoints({filter: 'theBestOne'});
        if (!bestUrls || bestUrls.length !== 1) {
            throw new FidjError(400, 'fidj.sdk.service.fidjForgotPasswordRequest : api endpoint does not exist.');
        }

        const query = new Ajax();
        await query.post({
            url: bestUrls[0].url + '/me/forgot',
            // not used : withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            data: {email}
        });
    }

    // Internal functions

    public async fidjGetIdToken() {
        return this.connection.getIdToken();
    };

    protected async _removeAll(): Promise<void | ErrorInterface> {
        await this.connection.destroy();
        await this.session.destroy();
    };

    /**
     * Logout then Login
     *
     * @param login
     * @param password
     * @param updateProperties
     * @throws {ErrorInterface}
     */
    private async _loginInternal(login: string, password: string, updateProperties?: any): Promise<ClientTokens> {
        this.logger.log('fidj.sdk.service._loginInternal');
        if (!this.connection.isReady()) {
            throw new FidjError(403, 'Need an initialized FidjService');
        }

        await this.connection.logout();

        const clientTokens = await this.connection.getClient().login(login, password, updateProperties);

        return clientTokens;
    };

    private async _createSession(uid: string): Promise<void | ErrorInterface> {
        const dbs: EndpointInterface[] = await this.connection.getDBs({filter: 'theBestOnes'});
        if (!dbs || dbs.length === 0) {
            this.logger.warn('Seems that you are in Demo mode or using Node (no remote DB).');
        }
        this.session.setRemote(dbs);
        return this.session.create(uid);
    };

    private async _testPromise(a?): Promise<any> {
        if (a) {
            return this.promise.resolve('test promise ok ' + a);
        }
        return new this.promise((resolve, reject) => {
            resolve('test promise ok');
        });
    };

    private _generateObjectUniqueId(appName, type?, name?) {

        // return null;
        const now = new Date();
        const simpleDate = '' + now.getFullYear() + '' + now.getMonth() + '' + now.getDate()
            + '' + now.getHours() + '' + now.getMinutes(); // new Date().toISOString();
        const sequId = ++FidjNodeService._srvDataUniqId;
        let UId = '';
        if (appName && appName.charAt(0)) {
            UId += appName.charAt(0) + '';
        }
        if (type && type.length > 3) {
            UId += type.substring(0, 4);
        }
        if (name && name.length > 3) {
            UId += name.substring(0, 4);
        }
        UId += simpleDate + '' + sequId;
        return UId;
    }

}
