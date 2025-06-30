import {assert, expect, spy, use} from 'chai';
import spies from 'chai-spies';
import {Session} from '../../src';

use(spies);

describe('Session', () => {
    const _sdk: any = {version: 'mock.sdk'};
    const _storage: any = {
        get: (key) => {},
        set: (key) => {},
        remove: (key) => {},
    };

    it('should be created', () => {
        const session = new Session();
        expect(!!session).eq(true);
        expect(session.isReady()).eq(false);
        expect(session.dbRecordCount).eq(0);
        expect(session.dbLastSync).eq(null);
    });

    xit('should sync KO : without connection', (done) => {
        const session = new Session();

        (session as any).db = {
            sync: () => {},
            replicate: {
                to: (remoteDb) => {},
            },
        };
        (session as any).remoteDb = {
            replicate: {
                to: (remoteDb) => {},
            },
        };
        (session as any).remoteUri = null;
        (session as any).dbs = [];
        const returned = {
            on: (code, callback) => {
                callback(code);
            },
        };

        spy.on((session as any).db.replicate, 'to', (returns) => returned);
        spy.on((session as any).remoteDb.replicate, 'to', (returns) => returned);
        session
            .sync('userId')
            .then(() => {
                assert.fail();
            })
            .catch((err) => {
                expect(err.code).eq(408);
                expect(err.reason).eq('need a remote db');
                expect((session as any).remoteUri).eq(null);
                expect((session as any).remoteDb).eq(true);
                expect((session as any).db.replicate.to).to.have.been.called.exactly(0);
                expect((session as any).remoteDb.replicate.to).to.have.been.called.exactly(0);
                done();
            });
    });
    /*
        it('should sync', (done) => {
            const session = new Session();

            (session as any).db = {
                sync: () => {
                },
                replicate: {
                    to: (remoteDb) => {
                    }
                }
            };
            (session as any).remoteDb = {
                replicate: {
                    to: (remoteDb) => {
                    }
                }
            };
            (session as any).remoteUri = 'dbs1';
            (session as any).dbs = [{url: 'dbs1'}, {url: 'dbs2'}];
            spy.on((session as any).db.replicate, 'to', returns =>{
                on: (code, callback) => {
                    callback(code)
                }
            });
            spy.on((session as any).remoteDb.replicate, 'to', returns =>{
                on: (code, callback) => {
                    callback(code)
                }
            });
            session.sync('userId')
                .then((none) => {
                    expect(none).toBeUndefined();
                    expect((session as any).remoteUri). eq('dbs1');
                    expect((session as any).remoteDb).toBeTruthy();
                    expect((session as any).db.replicate.to).toHaveBeenCalledTimes(1);
                    expect((session as any).remoteDb.replicate.to).toHaveBeenCalledTimes(1);
                    done();
                })
                .catch((err) => assert.fail(err))

        });

        it('should put string', (done) => {
            const session = new Session();
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.put = (data, callback) => {
                expect(data.fidjData). eq('{"string":"mockdata"}');
                const response = {ok: true, id: 'mockid', rev: 'mockrev'};
                callback(null, response);
            };
            session.put('mockdata', '_id', 'uid', 'oid', 'ave')
                .then((info) => {
                    expect(info). eq('mockid');
                    expect((session as any).dbRecordCount). eq(1);
                    done();
                })
                .catch((err) => assert.fail(err))
        });

        it('should put json without keyword (_id,json,...)', (done) => {
            const session = new Session();
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.put = (data, callback) => {
                expect(data._id). eq('_id');
                expect(data.fidjData). eq('{"json":{"test":"test val","data":"data val"}}');
                const response = {ok: true, id: 'mockid', rev: 'mockrev'};
                callback(null, response);
            };
            session.put({test: 'test val', data: 'data val'}, '_id', 'uid', 'oid', 'ave')
                .then((info) => {
                    expect(info._id). eq('mockid');
                    expect(info._rev). eq('mockrev');
                    expect((session as any).dbRecordCount). eq(1);
                    done();
                })
                .catch((err) => assert.fail(err))
        });

        it('should put json', (done) => {
            const session = new Session();
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.put = (data, callback) => {
                expect(data._id). eq('_id');
                expect(data.fidjData). eq('{"json":{"test":"mockjson"}}');
                const response = {ok: true, id: 'mockid', rev: 'mockrev'};
                callback(null, response);
            };
            session.put({_id: 'not_used', json: {test: 'mockjson'}}, '_id', 'uid', 'oid', 'ave')
                .then((info) => {
                    expect(info._id). eq('mockid');
                    expect(info._rev). eq('mockrev');
                    expect((session as any).dbRecordCount). eq(1);
                    done();
                })
                .catch((err) => assert.fail(err))
        });

        it('should put multiple json and update _rev', (done) => {
            const session = new Session();
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.put = (data, callback) => {
                let response;
                if (data._id === '_id1') {
                    expect(data._id). eq('_id1');
                    expect(data.fidjData). eq('{"json":{"test":"mockjson1"}}');
                    response = {ok: true, id: 'mockid1', rev: 'mockrev1'};
                } else {
                    expect(data._id). eq('_id2');
                    expect(data.fidjData). eq('{"json":{"test":"mockjson2"}}');
                    response = {ok: true, id: 'mockid2', rev: 'mockrev2'};

                }
                callback(null, response);
            };
            const put = [
                {_id: 'not_used1', json: {test: 'mockjson1'}}
                , {_id: 'not_used2', json: {test: 'mockjson2'}}
            ];

            session.put(put[0], '_id1', 'uid1', 'oid1', 'ave1')
                .then((info) => {
                    expect(info._id). eq('mockid1');
                    expect(info._rev). eq('mockrev1');
                    expect((session as any).dbRecordCount). eq(1);

                    expect((put[0] as any)._rev). eq('mockrev1');
                    expect((put[1] as any)._rev).toBeUndefined();

                    return session.put(put[1], '_id2', 'uid2', 'oid2', 'ave2');
                })
                .then((info) => {
                    expect(info._id). eq('mockid2');
                    expect(info._rev). eq('mockrev2');
                    expect((session as any).dbRecordCount). eq(2);

                    expect((put[0] as any)._rev). eq('mockrev1');
                    expect((put[1] as any)._rev). eq('mockrev2');

                    done();
                })
                .catch((err) => assert.fail(err))
        });

        it('should put json encrypted', (done) => {
            const session = new Session();
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.put = (data, callback) => {
                expect(data._id). eq('_id');
                expect(data.fidjDacr). eq('encrypted');
                const response = {ok: true, id: 'mockid', rev: 'mockrev'};
                callback(null, response);
            };
            const obj = {
                crypto: (jsonStr: string) => {
                    return ';'
                }
            };
            spy.on(obj, 'crypto', returns =>'encrypted');
            const crypto: SessionCryptoInterface = {
                obj: obj,
                method: 'crypto'
            };
            session.put({_id: 'not_used', json: {test: '{"id":"mockjson"}'}}, '_id', 'uid', 'oid', 'ave', crypto)
                .then((info) => {
                    expect(info._id). eq('mockid');
                    expect(info._rev). eq('mockrev');
                    expect(obj.crypto).toHaveBeenCalledTimes(1);
                    expect(obj.crypto).toHaveBeenCalledWith('{"json":{"test":"{\\"id\\":\\"mockjson\\"}"}}');
                    expect((session as any).dbRecordCount). eq(1);
                    done();
                })
                .catch((err) => assert.fail(err))
        });

        it('should get string', (done) => {
            const session = new Session();
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.get = (id) => {
                expect(id). eq('_id');
                const row = {_id: '_id', _rev: '_rev', fidjData: '{"string":"mockdata"}'};
                return Promise.resolve(row);
            };
            session.get('_id')
                .then((result) => {
                    expect(JSON.stringify(result)). eq('{"string":"mockdata","_id":"_id","_rev":"_rev"}');
                    done();
                })
                .catch((err) => assert.fail(err))
        });

        it('should get json', (done) => {
            const session = new Session();

            expect(JSON.stringify({'json': {'id': 'mockjson'}})). eq('{"json":{"id":"mockjson"}}');
            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.get = (id) => {
                expect(id). eq('_id');
                const row = {_id: '_id', _rev: '_rev', fidjData: '{"json":{"id":"mockjson"}}'};
                return Promise.resolve(row);
            };
            session.get('_id')
                .then((result) => {
                    expect(JSON.stringify(result)). eq('{"id":"mockjson","_id":"_id","_rev":"_rev"}');
                    expect(result._id). eq('_id');
                    expect(result.id). eq('mockjson');
                    done();
                })
                .catch((err) => assert.fail(err))

        });

        it('should get json encrypted', (done) => {
            const session = new Session();

            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.get = (id) => {
                expect(id). eq('_id');
                const row = {_id: '_id', _rev: '_rev', fidjDacr: 'to_decrypt'};
                return Promise.resolve(row);
            };
            const obj = {
                decrypt: (str) => {
                    return {};
                }
            };
            spy.on(obj, 'decrypt', returns =>{json: '{"id" : "mockjson"}'});
            const crypto: SessionCryptoInterface = {
                obj: obj,
                method: 'decrypt'
            };
            session.get('_id', crypto)
                .then((result) => {
                    expect(JSON.stringify(result)). eq('{"id":"mockjson","_id":"_id","_rev":"_rev"}');
                    expect(result._id). eq('_id');
                    expect(result.id). eq('mockjson');
                    expect(obj.decrypt).toHaveBeenCalledTimes(1);
                    expect(obj.decrypt).toHaveBeenCalledWith('to_decrypt');
                    done();
                })
                .catch((err) => assert.fail(err))

        });

        it('should getAll mixed and encrypted', (done) => {
            const session = new Session();

            (session as any).db = {};
            (session as any).dbs = ['dbs1', 'dbs2'];
            (session as any).db.allDocs = () => {
                const rows = [];
                const row1 = {_id: '_id1', _rev: '_rev1', fidjDacr: '{"string":"to_decrypt1"}'};
                const row2 = {_id: '_id2', _rev: '_rev2', fidjDacr: '{"json":{"id":"to_decrypt2"}}'};
                const row3 = {_id: '_id3', _rev: '_rev3', fidjDacr: '{"number":"to_decrypt3"}'};
                rows.push({doc: row1});
                rows.push({doc: row2});
                rows.push({doc: row3});
                return Promise.resolve({rows: rows});
            };
            const obj = {
                decrypt: (str) => {
                    return {};
                }
            };
            spy.on(obj, 'decrypt', returns =>{'string': 'decrypted'});
            const crypto: SessionCryptoInterface = {
                obj: obj,
                method: 'decrypt'
            };
            session.getAll(crypto)
                .then((results: Array<any>) => {
                    expect(results.length). eq(3);
                    expect(JSON.stringify(results[0])). eq('{"string":"decrypted","_id":"_id1","_rev":"_rev1"}');
                    expect(JSON.stringify(results[1])). eq('{"string":"decrypted","_id":"_id2","_rev":"_rev2"}');
                    expect(JSON.stringify(results[2])). eq('{"string":"decrypted","_id":"_id3","_rev":"_rev3"}');
                    expect(obj.decrypt).toHaveBeenCalledTimes(3);
                    expect(obj.decrypt).toHaveBeenCalledWith('{"string":"to_decrypt1"}');
                    expect(obj.decrypt).toHaveBeenCalledWith('{"json":{"id":"to_decrypt2"}}');
                    expect(obj.decrypt).toHaveBeenCalledWith('{"number":"to_decrypt3"}');
                    done();
                })
                .catch((err) => assert.fail(err))

        });
    */
});
