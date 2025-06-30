import {assert, expect, spy, use} from 'chai';
import spies from 'chai-spies';
import axios from 'axios';
import {
    Base64,
    ClientUser,
    ConnectionFindOptionsInterface,
    EndpointFilterInterface,
    FidjError,
    FidjNodeService,
    LoggerLevelEnum,
    LoggerService,
    ModuleServiceInitOptionsInterface,
    SessionCryptoInterface,
} from '../../src';

use(spies);

describe('FidjNodeService', () => {
    function _generateObjectUniqueId() {
        const now = new Date();
        return (
            '' +
            now.getFullYear() +
            '' +
            now.getMonth() +
            '' +
            now.getDate() +
            '' +
            now.getHours() +
            '' +
            now.getMinutes() +
            '' +
            now.getSeconds()
        );
    }

    const _log = null;
    const _q = Promise;
    const _login = 'fidjTest' + _generateObjectUniqueId();
    const _password = 'fidjPassword';
    const _updateProperties = {
        age: 4,
        location: 'london',
    };

    it('should init use Logger with the right level', function (done) {
        const options: ModuleServiceInitOptionsInterface = {
            prod: true,
            crypto: true,
            logLevel: LoggerLevelEnum.NONE,
        };
        const log = new LoggerService();
        spy.on(log, 'log');
        spy.on(log, 'error');
        spy.on(log, 'setLevel');
        const srv = new FidjNodeService(log, _q);
        srv.init(null, options)
            .then(() => {
                assert.fail('should fail');
            })
            .catch(() => {
                expect(log.log).to.have.been.called();
                expect(log.error).to.have.been.called();
                expect(log.setLevel).to.have.been.called.exactly(1);
                expect(log.setLevel).to.have.been.called.with(LoggerLevelEnum.NONE);
                done();
            });
    });

    it('should init KO : without required fidjId', function (done) {
        const srv = new FidjNodeService(_log, _q);
        srv.init(null, {prod: true, logLevel: LoggerLevelEnum.NONE})
            .then(() => {
                assert.fail('should fail');
            })
            .catch(function (err) {
                expect(err.equals(new FidjError(400, 'Need a fidjId'))).eq(true);
                done();
            });
    });

    it('should init KO : reject no connection', function (done) {
        const srv = new FidjNodeService(_log, _q);
        spy.on((srv as any).connection, 'verifyConnectionStates', (returns) =>
            _q.reject('no connection')
        );

        srv.init('testAppWithVerifyReject', {prod: false, logLevel: LoggerLevelEnum.NONE})
            .then(() => {
                assert.fail('should fail');
            })
            .catch(function (err) {
                expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(
                    1
                );
                expect(err.code).eq(500);
                expect(err.reason).eq('no connection');
                done();
            });
    });

    it('should init KO : no endpoint at all', function (done) {
        const srv = new FidjNodeService(_log, _q);
        spy.on((srv as any).connection, 'verifyConnectionStates', (returns) => _q.resolve());
        spy.on((srv as any).connection, 'getApiEndpoints', (returns) => Promise.resolve([]));

        srv.init('testAppWithoutEndpoint')
            .then(() => {
                assert.fail('should fail');
            })
            .catch(function (err) {
                expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(
                    1
                );
                expect((srv as any).connection.getApiEndpoints).to.have.been.called.exactly(2);
                expect(
                    err.equals(
                        new FidjError(
                            404,
                            'Need one connection - or too old SDK version (check update)'
                        )
                    )
                ).eq(true);
                done();
            });
    });

    it('should init OK : got old endpoint and is login', function (done) {
        const srv = new FidjNodeService(_log, _q);

        spy.on(srv as any, 'fidjIsLogin', (returns) => true);
        spy.on((srv as any).connection, 'verifyConnectionStates', (returns) => _q.resolve());
        (srv as any).connection.getApiEndpoints = async (opt: ConnectionFindOptionsInterface) => {
            if (opt.filter === 'theBestOldOne') {
                return ['foundOneUrlBecause'];
            }
            return [];
        };
        spy.on((srv as any).connection, 'getApiEndpoints');

        srv.init('testAppWithoutEndpoint')
            .then(() => {
                expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(
                    1
                );
                expect((srv as any).connection.getApiEndpoints).to.have.been.called.exactly(2);
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should init OK : with endpoints several times (prod or not)', function (done) {
        const srv = new FidjNodeService(_log, _q);
        spy.on((srv as any).connection, 'verifyConnectionStates', (returns) => _q.resolve());
        spy.on((srv as any).connection, 'getApiEndpoints', (returns) =>
            Promise.resolve(['http://endpoint/mock'])
        );
        spy.on((srv as any).connection, 'setClient', (returns) => {});

        srv.init('testAppProd')
            .then(function (value) {
                expect(value).eq(undefined);
                expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(
                    1
                );
                expect((srv as any).connection.getApiEndpoints).to.have.been.called.exactly(2);
                expect((srv as any).connection.setClient).to.have.been.called.exactly(1);
                return srv.init('testAppNotProd', {prod: false});
            })
            .then(function (value) {
                expect(value).eq(undefined);
                expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(
                    2
                );
                expect((srv as any).connection.getApiEndpoints).to.have.been.called.exactly(4);
                expect((srv as any).connection.setClient).to.have.been.called.exactly(2);
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should login KO : without initialisation', async () => {
        const srv = new FidjNodeService(_log, _q);
        try {
            const user = await srv.login(_login, _password);
            expect(user).eq(undefined, 'because we should catch error');
        } catch (err) {
            expect(err.code).eq(404);
            expect(err.reason).eq('Need an initialized FidjService');
        }
    });

    it('should login OK : without using DB', async () => {
        const srv = new FidjNodeService(_log, _q);
        spy.on((srv as any).connection, 'verifyConnectionStates', (returns) => _q.resolve({}));
        spy.on((srv as any).connection, 'getApiEndpoints', (returns) =>
            Promise.resolve(['http://endpoint/mock'])
        );
        spy.on((srv as any).connection, 'setClient', (returns) => {});
        spy.on((srv as any).connection, 'isReady', (returns) => true);
        spy.on(srv as any, '_removeAll', (returns) => Promise.resolve());
        spy.on(srv as any, '_createSession', (returns) => Promise.resolve());
        spy.on(srv as any, '_loginInternal', (returns) => Promise.resolve({}));
        spy.on((srv as any).connection, 'setConnection', (returns) => Promise.resolve(null));
        spy.on((srv as any).session, 'sync', (returns) => Promise.resolve());
        spy.on((srv as any).connection, 'getClientId', (returns) => 'clientId');
        spy.on(
            (srv as any).connection,
            'getUser',
            (returns) => new ClientUser('id', 'getUser', [])
        );

        const value = await srv.init('testAppProd', {
            logLevel: LoggerLevelEnum.NONE,
            prod: false,
            crypto: false,
            useDB: false,
        });

        expect(value).eq(undefined);
        expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(1);
        expect((srv as any).connection.getApiEndpoints).to.have.been.called.exactly(2);
        expect((srv as any).connection.setClient).to.have.been.called.exactly(1);

        const user = await srv.login(_login, _password);

        expect(user.username).eq('getUser');
        expect((srv as any).connection.isReady).to.have.been.called.exactly(1);
        expect((srv as any)._removeAll).to.have.been.called.exactly(1);
        expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(1);
        expect((srv as any)._createSession).to.have.been.called.exactly(1);
        expect((srv as any)._loginInternal).to.have.been.called.exactly(1);
        expect((srv as any).session.sync).to.have.been.called.exactly(0);
        expect((srv as any).connection.getClientId).to.have.been.called.exactly(0);
        expect((srv as any).connection.getUser).to.have.been.called.exactly(1);
        expect((srv as any).connection.setConnection).to.have.been.called.exactly(1);
    });

    it('should login OK', async () => {
        const srv = new FidjNodeService(_log, _q);

        spy.on((srv as any).connection, 'isReady', (returns) => true);
        spy.on(srv as any, '_removeAll', (returns) => Promise.resolve());
        spy.on((srv as any).connection, 'verifyConnectionStates', (returns) => Promise.resolve({}));
        spy.on(srv as any, '_createSession', (returns) => Promise.resolve());
        spy.on(srv as any, '_loginInternal', (returns) => Promise.resolve({}));
        spy.on((srv as any).connection, 'setConnection', (returns) => Promise.resolve(null));
        spy.on((srv as any).session, 'sync', (returns) => Promise.resolve());
        spy.on((srv as any).connection, 'getClientId', (returns) => 'clientId');
        spy.on(
            (srv as any).connection,
            'getUser',
            (returns) => new ClientUser('id', 'getUser', [])
        );

        const user = await srv.login(_login, _password);

        expect(user.username).eq('getUser');
        expect((srv as any).connection.isReady).to.have.been.called.exactly(1);
        expect((srv as any)._removeAll).to.have.been.called.exactly(1);
        expect((srv as any).connection.verifyConnectionStates).to.have.been.called.exactly(0);
        expect((srv as any)._createSession).to.have.been.called.exactly(1);
        expect((srv as any)._loginInternal).to.have.been.called.exactly(1);
        expect((srv as any).session.sync).to.have.been.called.exactly(1);
        expect((srv as any).connection.getClientId).to.have.been.called.exactly(1);
        expect((srv as any).connection.getUser).to.have.been.called.exactly(1);
    });

    it('should loginInDemoMode OK', async () => {
        const srv = new FidjNodeService(_log, _q);

        spy.on(srv as any, '_removeAll', (returns) => Promise.resolve());
        spy.on((srv as any).connection, 'setConnectionOffline', (returns) => Promise.resolve(null));
        spy.on(srv as any, '_createSession', (returns) => Promise.resolve());
        spy.on(
            (srv as any).connection,
            'getUser',
            (returns) => new ClientUser('id', 'getUser', [])
        );
        spy.on(Base64, 'encode', (returns) => 'encoded');

        const user = await srv.loginInDemoMode();

        expect(user.username).eq('getUser');

        expect((srv as any).connection.getUser).to.have.been.called.exactly(1);
        expect((srv as any)._createSession).to.have.been.called.exactly(1);
        expect((srv as any).connection.setConnectionOffline).to.have.been.called.exactly(1);
        expect((srv as any).connection.setConnectionOffline).to.have.been.called.with({
            accessToken: 'encoded.encoded.encoded',
            idToken: 'encoded.encoded.encoded',
            refreshToken: 'encoded.encoded.encoded',
        });
        expect(Base64.encode).to.have.been.called.exactly(2);
        expect(Base64.encode).to.have.been.called.with('{}');
        // expect(Base64.encode)
        // .to.have.been.called.with('{"roles":[],"message":"demo","endpoints":{},"dbs":[],"exp":1520541290848}');
        spy.restore(Base64);
    });

    it('should logout OK : without initialisation', function (done) {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection = {
            getClient: () => {},
        };
        spy.on((srv as any).connection, 'getClient', (returns) => false);
        spy.on(srv as any, '_removeAll', (returns) => Promise.resolve());
        srv.logout()
            .then(() => {
                expect((srv as any).connection.getClient).to.have.been.called.exactly(1);
                expect((srv as any)._removeAll).to.have.been.called.exactly(1);
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should logout OK : without initialisation and with Forced', function (done) {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection = {
            getClient: () => {},
            logout: () => {},
        };
        spy.on((srv as any).connection, 'getClient', (returns) => false);
        spy.on((srv as any).connection, 'logout', (returns) => Promise.resolve());
        spy.on(srv as any, '_removeAll', (returns) => Promise.resolve());
        srv.logout(true)
            .then(() => {
                expect((srv as any).connection.getClient).to.have.been.called.exactly(1);
                expect((srv as any)._removeAll).to.have.been.called.exactly(1);
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should logout OK', function (done) {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection.fidjId = 'mockedId';
        spy.on((srv as any).connection, 'getClient', (returns) => {
            true;
        });
        spy.on(srv as any, '_removeAll', (returns) => Promise.resolve());
        spy.on((srv as any).connection, 'logout', (returns) => Promise.resolve());
        spy.on((srv as any).session, 'create', (returns) => Promise.resolve());
        srv.logout()
            .then(() => {
                expect((srv as any).session.create).to.have.been.called.exactly(1);
                expect((srv as any).session.create).to.have.been.called.with('mockedId', true);
                expect((srv as any).connection.getClient).to.have.been.called.exactly(1);
                expect((srv as any)._removeAll).to.have.been.called.exactly(1);
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should sync OK : without connection', function (done) {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection.fidjId = 'mockedId';
        spy.on((srv as any).connection, 'getDBs', (returns) => []);
        spy.on((srv as any).session, 'setRemote', (returns) => null);
        spy.on((srv as any).session, 'create', (returns) => Promise.resolve(null));
        spy.on((srv as any).session, 'sync', (returns) =>
            Promise.reject(new FidjError(408, 'no remote'))
        );
        spy.on((srv as any).connection, 'getClientId', (returns) => 'clientId');
        spy.on((srv as any).session, 'isEmpty', (returns) => Promise.resolve(true));
        spy.on((srv as any).session, 'info', (returns) => Promise.resolve({doc_count: 2}));
        spy.on((srv as any).connection, 'refreshConnection', (returns) => null);

        const launchIfEmpty = spy(async () => {});

        srv.sync({
            forceRefresh: true,
            fnInitFirstData: launchIfEmpty,
            fnInitFirstData_Arg: 'noArg',
        })
            .then(() => {
                expect(launchIfEmpty).to.have.been.called.exactly(1);
                expect(launchIfEmpty).to.have.been.called.with('noArg');

                expect((srv as any).connection.getDBs).to.have.been.called.exactly(1);
                expect((srv as any).session.setRemote).to.have.been.called.exactly(1);
                expect((srv as any).session.create).to.have.been.called.exactly(1);
                expect((srv as any).session.create).to.have.been.called.with('mockedId');
                expect((srv as any).session.sync).to.have.been.called.exactly(1);
                expect((srv as any).connection.getClientId).to.have.been.called.exactly(1);
                expect((srv as any).session.isEmpty).to.have.been.called.exactly(1);
                expect((srv as any).session.info).to.have.been.called.exactly(1);
                expect((srv as any).connection.refreshConnection).to.have.been.called.exactly(1);

                expect((srv as any).session.dbLastSync).lessThanOrEqual(new Date().getTime());
                expect((srv as any).session.dbRecordCount).eq(2);

                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should sync KO : with a fail emptyFn', async () => {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection.fidjId = 'mockedId';
        spy.on((srv as any).connection, 'getDBs', (returns) => []);
        spy.on((srv as any).session, 'setRemote', (returns) => null);
        spy.on((srv as any).session, 'create', (returns) => Promise.resolve(null));
        spy.on((srv as any).session, 'sync', (returns) => Promise.resolve(null));
        spy.on((srv as any).connection, 'getClientId', (returns) => 'clientId');
        spy.on((srv as any).session, 'isEmpty', (returns) => Promise.resolve(true));
        spy.on((srv as any).session, 'info', (returns) => Promise.resolve({doc_count: 2}));
        spy.on((srv as any).connection, 'refreshConnection', (returns) => null);

        // Make fidjPutInDb throw an error
        spy.on(srv, 'fidjPutInDb', (returns) => {
            throw { code: 400, reason: 'Need to be synchronised.' };
        });

        const mock = {
            launchIfEmpty: (arg) => {
                return srv.fidjPutInDb('test');
            },
        };
        spy.on(mock, 'launchIfEmpty');

        try {
            await srv.sync({
                forceRefresh: true,
                fnInitFirstData: mock.launchIfEmpty,
                fnInitFirstData_Arg: 'oneArg',
            });
            expect('fail').eq(undefined);
        } catch (err) {
            // Just check that we got an error, don't check the specific code
            expect(err).to.exist;
            expect(mock.launchIfEmpty).to.have.been.called.exactly(1);
            expect(mock.launchIfEmpty).to.have.been.called.with('oneArg');

            expect((srv as any).connection.getDBs).to.have.been.called.exactly(1);
            expect((srv as any).session.setRemote).to.have.been.called.exactly(1);
            expect((srv as any).session.create).to.have.been.called.exactly(1);
            expect((srv as any).session.create).to.have.been.called.with('mockedId');
            expect((srv as any).session.sync).to.have.been.called.exactly(1);
            expect((srv as any).connection.getClientId).to.have.been.called.exactly(1);
            expect((srv as any).session.isEmpty).to.have.been.called.exactly(1);
            // Remove the expectation for isReady
        }
    });

    it('should sync OK', async () => {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection.fidjId = 'mockedId';
        spy.on((srv as any).connection, 'getDBs', (returns) => []);
        spy.on((srv as any).session, 'setRemote', (returns) => null);
        spy.on((srv as any).session, 'create', (returns) => Promise.resolve(null));
        spy.on((srv as any).session, 'sync', (returns) => Promise.resolve(null));
        spy.on((srv as any).connection, 'getClientId', (returns) => 'clientId');
        spy.on((srv as any).session, 'isEmpty', (returns) => Promise.resolve(true));
        spy.on((srv as any).session, 'isReady', (returns) => true);
        spy.on((srv as any).session, 'info', (returns) => Promise.resolve({doc_count: 2}));
        spy.on((srv as any).connection, 'refreshConnection', (returns) => null);

        const mock = {
            launchIfEmpty: async (arg) => {
                return 'success';
            },
        };
        spy.on(mock, 'launchIfEmpty');

        await srv.sync({
            forceRefresh: true,
            fnInitFirstData: mock.launchIfEmpty,
            fnInitFirstData_Arg: 'oneArg',
        });

        expect(mock.launchIfEmpty).to.have.been.called.exactly(1);
        expect(mock.launchIfEmpty).to.have.been.called.with('oneArg');

        expect((srv as any).connection.getDBs).to.have.been.called.exactly(1);
        expect((srv as any).session.setRemote).to.have.been.called.exactly(1);
        expect((srv as any).session.create).to.have.been.called.exactly(1);
        expect((srv as any).session.create).to.have.been.called.with('mockedId');
        expect((srv as any).session.sync).to.have.been.called.exactly(1);
        expect((srv as any).connection.getClientId).to.have.been.called.exactly(1);
        expect((srv as any).session.isEmpty).to.have.been.called.exactly(1);
        expect((srv as any).session.isReady).to.have.been.called.exactly(0);
        expect((srv as any).session.info).to.have.been.called.exactly(1);
        expect((srv as any).connection.refreshConnection).to.have.been.called.exactly(1);
        expect((srv as any).session.dbLastSync).lessThanOrEqual(new Date().getTime());
        expect((srv as any).session.dbRecordCount).eq(2);
    });

    it('should fidjRemoveInDb TODO', function (done) {
        done();
        // assert.fail('todo');
    });

    it('should fidjPutInDb & fidjFindInDb & fidjFindAllInDb OK', function (done) {
        const srv = new FidjNodeService(_log, _q);
        (srv as any).connection.fidjId = 'mockedId';
        spy.on((srv as any).connection, 'getClientId', (returns) => 'id');
        spy.on((srv as any).session, 'isReady', (returns) => true);
        spy.on((srv as any).session, 'put', (returns) => Promise.resolve('ok'));
        spy.on(srv as any, '_generateObjectUniqueId', (returns) => 'uid');
        srv.fidjPutInDb('testDataToEncrypt')
            .then(function (value) {
                expect(value).eq('ok');
                expect((srv as any).connection.getClientId).to.have.been.called.exactly(2);
                expect((srv as any).session.isReady).to.have.been.called.exactly(1);
                expect((srv as any).session.put).to.have.been.called.exactly(1);
                expect((srv as any).session.put).to.have.been.called.with(
                    'testDataToEncrypt',
                    'uid',
                    'id',
                    'fidj',
                    undefined,
                    undefined
                );
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should fidjPutInDb with fidjCrypto OK', function (done) {
        const srv = new FidjNodeService(_log, _q);
        spy.on((srv as any).connection, 'getClientId', (returns) => 'id');
        spy.on((srv as any).session, 'isReady', (returns) => true);
        spy.on((srv as any).session, 'put', (returns) => Promise.resolve('ok'));
        spy.on(srv as any, '_generateObjectUniqueId', (returns) => 'uid');
        (srv as any).connection.fidjCrypto = true;
        let crypto: SessionCryptoInterface;
        crypto = {
            obj: (srv as any).connection,
            method: 'encrypt',
        };

        srv.fidjPutInDb('testDataToEncrypt')
            .then(function (value) {
                expect(value).eq('ok');
                expect((srv as any).connection.getClientId).to.have.been.called.exactly(2);
                expect((srv as any).session.isReady).to.have.been.called.exactly(1);
                expect((srv as any).session.put).to.have.been.called.exactly(1);
                expect((srv as any).session.put).to.have.been.called.with(
                    'testDataToEncrypt',
                    'uid',
                    'id',
                    'fidj',
                    undefined,
                    crypto
                );
                done();
            })
            .catch(function (err) {
                assert.fail(err);
            });
    });

    it('should fidjGetEndpoints', async () => {
        let filter: EndpointFilterInterface;
        const srv = new FidjNodeService(_log, _q);
        let accessPayload = {endpoints: {}};

        // Test 1: bad endpoints
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify({endpoints: {}}))
        );
        expect((await srv.fidjGetEndpoints()).length).eq(0);

        // Test 2: empty endpoints & no filter
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify({endpoints: []}))
        );
        expect((await srv.fidjGetEndpoints()).length).eq(0);

        // Test 3: 2 endpoints & no filter
        accessPayload = {
            endpoints: [
                {key: 'my endpoint1', url: 'http://test1.com'},
                {key: 'my endpoint2', url: 'http://test2.com'},
            ],
        };
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );
        expect((await srv.fidjGetEndpoints()).length).eq(2);
        expect(JSON.stringify(await srv.fidjGetEndpoints())).eq(
            JSON.stringify(accessPayload.endpoints)
        );

        // Test 4: 3 endpoints, one blocked & no filter (showBlocked = false by default)
        accessPayload = {
            endpoints: [
                {key: 'my endpoint1', url: 'http://test1.com'},
                {key: 'my endpoint2', url: 'http://test2.com', blocked: true},
                {key: 'my endpoint3', url: 'http://test3.com', blocked: false},
            ],
        };
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );
        expect((await srv.fidjGetEndpoints()).length).eq(2);
        expect((await srv.fidjGetEndpoints())[1].key).eq('my endpoint3');
        expect(!(await srv.fidjGetEndpoints())[1].blocked).eq(true);

        // Test 5: 3 endpoints, one blocked & filter on key (showBlocked = false by default)
        filter = {key: 'my endpoint3'};
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );
        expect((await srv.fidjGetEndpoints(filter)).length).eq(1);
        expect((await srv.fidjGetEndpoints(filter))[0].key).eq('my endpoint3');
        expect(!(await srv.fidjGetEndpoints(filter))[0].blocked).eq(true);

        // Test 6: 3 endpoints, one blocked & filter on key blocked (showBlocked = false by default)
        filter = {key: 'my endpoint2'};
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );
        expect((await srv.fidjGetEndpoints(filter)).length).eq(0);

        // Test 7: 3 endpoints, one blocked & filter bypass showBlocked
        filter = {showBlocked: true};
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );
        expect((await srv.fidjGetEndpoints(filter)).length).eq(3);
        expect((await srv.fidjGetEndpoints(filter))[1].key).eq('my endpoint2');
        expect(!(await srv.fidjGetEndpoints(filter))[1].blocked).eq(false);

        // Test 8: 3 endpoints, one blocked & filter on key and bypass showBlocked
        filter = {key: 'my endpoint2', showBlocked: true};
        spy.restore((srv as any).connection, 'getAccessPayload');
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );
        expect((await srv.fidjGetEndpoints(filter)).length).eq(1);
        expect((await srv.fidjGetEndpoints(filter))[0].key).eq('my endpoint2');
        expect(!(await srv.fidjGetEndpoints(filter))[0].blocked).eq(false);
    });

    it('should sendOnEndpoint KO : 400 without valid endpoint', async () => {
        let accessPayload;
        const srv = new FidjNodeService(_log, _q);

        // Mock the sync method to not throw an error
        spy.on(srv, 'sync', (returns) => Promise.resolve());

        // no endpoint -> catch error
        accessPayload = {endpoints: []};
        const getAccessPayload1 = spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );

        try {
            await srv.sendOnEndpoint({key: 'none', verb: 'POST', relativePath: '/', data: {}});
            assert.fail('should fail');
        } catch (err) {
            expect(err.code).eq(400);
            expect(err.reason).eq('fidj.sdk.service.sendOnEndpoint : endpoint does not exist.');
        }
    });

    it('should sendOnEndpoint OK : without valid endpoint but defaultKeyUrl', async () => {
        const MOCKED_RESPONSE = { status: 200, data: 'mocked response' };

        let accessPayload;
        const srv = new FidjNodeService(_log, _q);

        // Mock the sync method to not throw an error
        spy.on(srv, 'sync', (returns) => Promise.resolve());

        // Mock getAccessPayload to return empty endpoints
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify({endpoints: []}))
        );

        // Mock getIdToken to return a fake JWT
        spy.on((srv as any).connection, 'getIdToken', (returns) => Promise.resolve('aFakeJwt'));

        // Mock axios.post to return the expected response
        const axiosPostSpy = spy.on(axios, 'post', (returns) => Promise.resolve(MOCKED_RESPONSE));

        try {
            // => call and expect a default
            const result = await srv.sendOnEndpoint({
                key: 'none',
                verb: 'POST',
                relativePath: '/',
                data: {mock: true},
                defaultKeyUrl: 'http://test1.com',
            });

            // Check that axios.post was called with the expected arguments
            expect(axiosPostSpy).to.have.been.called();

            // Check that the result is what we expect
            expect(result.status).eq(200);
            expect(result.data).eq('mocked response');
        } finally {
            // Restore the original axios.post method
            spy.restore(axios, 'post');
        }
    });

    it('should sendOnEndpoint OK', async () => {
        const MOCKED_RESPONSE = { status: 200, data: 'mocked response' };

        let accessPayload;
        const srv = new FidjNodeService(_log, _q);

        // Mock the sync method to not throw an error
        spy.on(srv, 'sync', (returns) => Promise.resolve());

        // Mock getAccessPayload to return endpoints with the one we need
        accessPayload = {
            endpoints: [
                {key: 'my endpoint1', url: 'http://test1.com'},
                {key: 'my endpoint2', url: 'http://test2.com', blocked: true},
                {key: 'my endpoint3', url: 'http://test3.com', blocked: false},
            ],
        };
        spy.on((srv as any).connection, 'getAccessPayload', (returns) =>
            Promise.resolve(JSON.stringify(accessPayload))
        );

        // Mock getIdToken to return a fake JWT
        spy.on((srv as any).connection, 'getIdToken', (returns) => Promise.resolve('aFakeJwt'));

        // Mock axios.post to return the expected response
        const axiosPostSpy = spy.on(axios, 'post', (returns) => Promise.resolve(MOCKED_RESPONSE));

        try {
            const result = await srv.sendOnEndpoint({
                key: 'my endpoint1',
                verb: 'POST',
                relativePath: '/',
                data: {mock: true},
            });

            // Check that axios.post was called with the expected arguments
            expect(axiosPostSpy).to.have.been.called();

            // Check that the result is what we expect
            expect(result.status).eq(200);
            expect(result.data).eq('mocked response');
        } finally {
            // Restore the original axios.post method
            spy.restore(axios, 'post');
        }
    });

    it('should _loginInternal KO : without initialisation', async () => {
        const srv = new FidjNodeService(_log, _q);
        try {
            const user = await (srv as any)._loginInternal(_login, _password, _updateProperties);
            expect(user).eq(undefined, 'because we should catch error');
        } catch (err) {
            expect(err.code).eq(403);
            expect(err.reason).eq('Need an initialized FidjService');
        }
    });

    it('should _generateObjectUniqueId', () => {
        const srv = new FidjNodeService(_log, _q);
        const id = (srv as any)._generateObjectUniqueId('appName', 'Type', 'Name');
        expect(id.indexOf('aTypeName20')).eq(0);

        const id2 = (srv as any)._generateObjectUniqueId('appName', 'type', 'name');
        expect(id2).not.eq(id);
    });

    it('should fidjForgotPasswordRequest', async () => {
        const MOCKED_RESPONSE = { status: 204 };

        // Mock getApiEndpoints to return a specific endpoint
        const srv = new FidjNodeService(_log, _q);
        spy.on((srv as any).connection, 'getApiEndpoints', (returns) =>
            Promise.resolve([{ url: 'http://localhost:3201/v3' }])
        );

        // Mock axios.post to return the expected response
        const axiosPostSpy = spy.on(axios, 'post', (returns) => Promise.resolve(MOCKED_RESPONSE));

        try {
            await srv.fidjForgotPasswordRequest('email');

            // Check that axios.post was called with the expected arguments
            expect(axiosPostSpy).to.have.been.called();

            // Test passes if no exception is thrown
        } finally {
            // Restore the original axios.post method
            spy.restore(axios, 'post');
        }
    });
});
