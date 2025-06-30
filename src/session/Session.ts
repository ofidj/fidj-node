// import PouchDB from 'pouchdb';
// let PouchDB: any;

// import PouchDB from 'pouchdb/dist/pouchdb.js';
import {EndpointInterface, ErrorInterface, FidjError} from '../sdk';

const FidjPouch = null;

// if (typeof window !== 'undefined' && typeof require !== 'undefined') {
// load cordova adapter : https://github.com/pouchdb-community/pouchdb-adapter-cordova-sqlite/issues/22
//  FidjPouch = (window['PouchDB']) ? window['PouchDB'] : require('pouchdb').default; // .default;
//  FidjPouch.plugin(require('pouchdb-adapter-cordova-sqlite'));
// }

export interface SessionCryptoInterface {
    obj: object;
    method: string;
}

export class Session {
    public dbRecordCount: number;
    public dbLastSync: number; // Date().getTime();

    private db: any; // PouchDB
    private remoteDb: any; // PouchDB;
    private remoteUri: string;
    private dbs: Array<EndpointInterface>;

    constructor() {
        this.db = null;
        this.dbRecordCount = 0;
        this.dbLastSync = null;
        this.remoteDb = null;
        this.dbs = [];
    }

    static write(item: any): string {
        let value = 'null';
        const t = typeof item;
        if (t === 'undefined') {
            value = 'null';
        } else if (value === null) {
            value = 'null';
        } else if (t === 'string') {
            value = JSON.stringify({string: item});
        } else if (t === 'number') {
            value = JSON.stringify({number: item});
        } else if (t === 'boolean') {
            value = JSON.stringify({bool: item});
        } else if (t === 'object') {
            value = JSON.stringify({json: item});
        }
        return value;
    }

    static value(item: any): any {
        let result = item;
        if (typeof item !== 'object') {
            // return item;
        } else if ('string' in item) {
            result = item.string;
        } else if ('number' in item) {
            result = item.number.valueOf();
        } else if ('bool' in item) {
            result = item.bool.valueOf();
        } else if ('json' in item) {
            result = item.json;
            if (typeof result !== 'object') {
                result = JSON.parse(result);
            }
        }
        return result;
    }

    static extractJson(item: any): any {
        let result = item;
        if (!item) {
            return null;
        }
        if (typeof item === 'object' && 'json' in item) {
            result = item.json;
        }
        if (typeof result === 'string') {
            result = JSON.parse(result);
        }
        if (typeof result === 'object' && 'json' in result) {
            result = (result as any).json;
        }
        if (typeof result !== 'object') {
            result = null;
        }
        return result;
    }

    public isReady(): boolean {
        return !!this.db;
    }

    public create(uid: string, force?: boolean): Promise<any | ErrorInterface> {
        if (!force && this.db) {
            return Promise.resolve(this.db);
        }

        this.dbRecordCount = 0;
        this.dbLastSync = null; // new Date().getTime();
        this.db = null;
        uid = uid || 'default';

        if (typeof window === 'undefined' || !FidjPouch) {
            return Promise.resolve(this.db);
        }

        return new Promise((resolve, reject) => {
            let opts: any = {location: 'default'};
            try {
                if (window['cordova']) {
                    opts = {location: 'default', adapter: 'cordova-sqlite'};
                    //    const plugin = require('pouchdb-adapter-cordova-sqlite');
                    //    if (plugin) { Pouch.plugin(plugin); }
                    //    this.db = new Pouch('fidj_db', {adapter: 'cordova-sqlite'});
                }
                // } else {
                this.db = new FidjPouch('fidj_db_' + uid, opts); // , {adapter: 'websql'} ???
                // }

                this.db
                    .info()
                    .then((info) => {
                        // todo if (info.adapter !== 'websql') {
                        return resolve(this.db);
                        // }

                        // const newopts: any = opts || {};
                        // newopts.adapter = 'idb';
                        //
                        // const newdb = new Pouch('fidj_db', opts);
                        // this.db.replicate.to(newdb)
                        //     .then(() => {
                        //         this.db = newdb;
                        //         resolve();
                        //     })
                        //     .catch((err) => {
                        //         reject(new FidjError(400, err.toString()))
                        //     });
                    })
                    .catch((err) => {
                        reject(new FidjError(400, err));
                    });
            } catch (err) {
                reject(new FidjError(500, err));
            }
        });
    }

    public async destroy(): Promise<void> {
        if (!this.db) {
            this.dbRecordCount = 0;
            this.dbLastSync = null;
            return;
        }

        if (this.db && !this.db.destroy) {
            return Promise.reject(new FidjError(408, 'Need a valid db'));
        }

        return new Promise((resolve, reject) => {
            this.db.destroy((err, info) => {
                if (err) {
                    reject(new FidjError(500, err));
                } else {
                    this.dbRecordCount = 0;
                    this.dbLastSync = null;
                    this.db = null;
                    resolve();
                }
            });
        });
    }

    public setRemote(dbs: Array<EndpointInterface>): void {
        this.dbs = dbs;
    }

    public sync(userId: string): Promise<void | ErrorInterface> {
        if (!this.db) {
            return Promise.reject(new FidjError(408, 'need db'));
        }
        if (!this.dbs || !this.dbs.length) {
            return Promise.reject(new FidjError(408, 'need a remote db'));
        }

        return new Promise((resolve, reject) => {
            try {
                if (!FidjPouch) {
                    return;
                }

                if (!this.remoteDb || this.remoteUri !== this.dbs[0].url) {
                    this.remoteUri = this.dbs[0].url;
                    this.remoteDb = new FidjPouch(this.remoteUri);
                    // todo , {headers: {'Authorization': 'Bearer ' + id_token}});
                }

                this.db.replicate
                    .to(this.remoteDb)
                    .on('complete', (info) => {
                        return this.remoteDb.replicate
                            .to(this.db, {
                                filter: (doc) => {
                                    return !!userId && !!doc && doc.fidjUserId === userId;
                                },
                            })
                            .on('complete', () => {
                                // this.logger
                                resolve();
                            })
                            .on('denied', (err) => reject({code: 403, reason: {second: err}}))
                            .on('error', (err) => reject({code: 401, reason: {second: err}}));
                    })
                    .on('denied', (err) => reject({code: 403, reason: {first: err}}))
                    .on('error', (err) => reject({code: 401, reason: {first: err}}));
            } catch (err) {
                reject(new FidjError(500, err));
            }
        });
    }

    public put(
        data: any,
        _id: string,
        uid: string,
        oid: string,
        ave: string,
        crypto?: SessionCryptoInterface
    ): Promise<any | ErrorInterface> {
        if (!this.db) {
            return Promise.reject(new FidjError(408, 'need db'));
        }

        if (!data || !_id || !uid || !oid || !ave) {
            return Promise.reject(new FidjError(400, 'need formated data'));
        }

        const dataWithoutIds = JSON.parse(JSON.stringify(data));
        const toStore: any = {
            _id: _id,
            fidjUserId: uid,
            fidjOrgId: oid,
            fidjAppVersion: ave,
        };
        if (dataWithoutIds._rev) {
            toStore._rev = '' + dataWithoutIds._rev;
        }
        delete dataWithoutIds._id;
        delete dataWithoutIds._rev;
        delete dataWithoutIds.fidjUserId;
        delete dataWithoutIds.fidjOrgId;
        delete dataWithoutIds.fidjAppVersion;
        delete dataWithoutIds.fidjData;

        let resultAsString = Session.write(Session.value(dataWithoutIds));
        if (crypto) {
            resultAsString = crypto.obj[crypto.method](resultAsString);
            toStore.fidjDacr = resultAsString;
        } else {
            toStore.fidjData = resultAsString;
        }

        return new Promise((resolve, reject) => {
            this.db.put(toStore, (err, response) => {
                if (response && response.ok && response.id && response.rev) {
                    this.dbRecordCount++;

                    // propagate _rev & _id
                    if (typeof data === 'object') {
                        (data as any)._rev = response.rev;
                        (data as any)._id = response.id;
                        resolve(data);
                    } else {
                        resolve(response.id);
                    }
                } else {
                    reject(new FidjError(500, err));
                }
            });
        });
    }

    public remove(data_id: string): Promise<void | ErrorInterface> {
        if (!this.db) {
            return Promise.reject(new FidjError(408, 'need db'));
        }

        return new Promise((resolve, reject) => {
            this.db
                .get(data_id)
                .then((doc) => {
                    doc._deleted = true;
                    return this.db.put(doc);
                })
                .then((result) => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public get(data_id: string, crypto?: SessionCryptoInterface): Promise<any | ErrorInterface> {
        if (!this.db) {
            return Promise.reject(new FidjError(408, 'Need db'));
        }

        return new Promise((resolve, reject) => {
            this.db
                .get(data_id)
                .then((row) => {
                    if (!!row && (!!row.fidjDacr || !!row.fidjData)) {
                        let data = row.fidjDacr;
                        if (crypto && data) {
                            data = crypto.obj[crypto.method](data);
                        } else if (row.fidjData) {
                            data = JSON.parse(row.fidjData);
                        }
                        const resultAsJson = Session.extractJson(data);
                        if (resultAsJson) {
                            resultAsJson._id = row._id;
                            resultAsJson._rev = row._rev;
                            resolve(JSON.parse(JSON.stringify(resultAsJson)));
                        } else {
                            // row._deleted = true;
                            this.remove(row._id);
                            reject(new FidjError(400, 'Bad encoding'));
                        }
                    } else {
                        reject(new FidjError(400, 'No data found'));
                    }
                })
                .catch((err) => reject(new FidjError(500, err)));
        });
    }

    public getAll(crypto?: SessionCryptoInterface): Promise<Array<any> | ErrorInterface> {
        if (!this.db || !(this.db as any).allDocs) {
            return Promise.reject(new FidjError(408, 'Need a valid db'));
        }

        return new Promise((resolve, reject) => {
            (this.db as any)
                .allDocs({include_docs: true, descending: true})
                .then((rows) => {
                    const all = [];
                    rows.rows.forEach((row) => {
                        if (!!row && !!row.doc._id && (!!row.doc.fidjDacr || !!row.doc.fidjData)) {
                            let data = row.doc.fidjDacr;
                            if (crypto && data) {
                                data = crypto.obj[crypto.method](data);
                            } else if (row.doc.fidjData) {
                                data = JSON.parse(row.doc.fidjData);
                            }
                            const resultAsJson = Session.extractJson(data);
                            if (resultAsJson) {
                                resultAsJson._id = row.doc._id;
                                resultAsJson._rev = row.doc._rev;
                                all.push(JSON.parse(JSON.stringify(resultAsJson)));
                            } else {
                                console.error('Bad encoding : delete row');
                                // resultAsJson = {};
                                // resultAsJson._id = row.doc._id;
                                // resultAsJson._rev = row.doc._rev;
                                // resultAsJson._deleted = true;
                                // all.push(resultAsJson);
                                this.remove(row.doc._id);
                            }
                        } else {
                            console.error('Bad encoding');
                        }
                    });
                    resolve(all);
                })
                .catch((err) => reject(new FidjError(400, err)));
        });
    }

    public isEmpty(): Promise<boolean | ErrorInterface> {
        if (!this.db || !(this.db as any).allDocs) {
            return Promise.reject(new FidjError(408, 'No db'));
        }

        return new Promise((resolve, reject) => {
            (this.db as any)
                .allDocs({
                    // filter:  (doc) => {
                    //    if (!self.connection.user || !self.connection.user._id) return doc;
                    //    if (doc.fidjUserId === self.connection.user._id) return doc;
                    // }
                })
                .then((response) => {
                    if (!response) {
                        reject(new FidjError(400, 'No response'));
                    } else {
                        this.dbRecordCount = response.total_rows;
                        if (response.total_rows && response.total_rows > 0) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    }
                })
                .catch((err) => reject(new FidjError(400, err)));
        });
    }

    public info(): Promise<any> {
        if (!this.db) {
            return Promise.reject(new FidjError(408, 'No db'));
        }
        return this.db.info();
    }
}
