import {FidjNodeService} from '../../src/sdk/FidjNodeService';
import {LoggerService} from '../../src/sdk/logger.service';
import {SessionCryptoInterface} from '../../src/session';
import {ConnectionFindOptionsInterface, Error as FidjError} from '../../src/connection';
import {Base64, EndpointFilterInterface, ErrorInterface, LoggerLevelEnum, ModuleServiceInitOptionsInterface} from '../../src';
import createSpy = jasmine.createSpy;

describe('fidj.sdk', () => {

    function _generateObjectUniqueId() {
        const now = new Date();
        return '' + now.getFullYear() + '' + now.getMonth() + '' + now.getDate()
            + '' + now.getHours() + '' + now.getMinutes() + '' + now.getSeconds();
    }

    const _login = 'fidjTest' + _generateObjectUniqueId();
    const _password = 'fidjPassword';
    const _updateProperties = {
        age: 4,
        location: 'london'
    };

    describe('internal.service', () => {

        let _log;
        let _q: PromiseConstructor;

        beforeEach(() => {
            jasmine.Ajax.install();
            window.localStorage.clear();

            _log = null;
            // _log = console;
            _q = Promise;
            /*inject(function ($injector, _$log_, _$q_, _$rootScope_) {
                _log = console;//_$log_;//$injector.get('$log');
                _q = _$q_;
                _rootScope = _$rootScope_;
            });*/
        });
        afterEach(() => {
            jasmine.Ajax.uninstall();
        });

        it('should implement Promise', function (done) {

            const srv = new FidjNodeService(_log, _q);
            (srv as any)._testPromise()
                .then(function (msg) {
                    expect(msg).toBe('test promise ok');
                    done();
                })
                .catch(function (err) {
                    expect(err).toBe('should not come here');
                    done();
                });
        });

        it('should fidjInit use Logger with the right level', function (done) {

            const options: ModuleServiceInitOptionsInterface = {prod: true, crypto: true, logLevel: LoggerLevelEnum.NONE};
            const log = new LoggerService();
            spyOn(log, 'log');
            spyOn(log, 'error');
            spyOn(log, 'setLevel');
            const srv = new FidjNodeService(log, _q);
            srv
                .fidjInit(null, options)
                .then(() => {
                    done.fail('should fail');
                })
                .catch(() => {
                    expect(log.log).toHaveBeenCalled();
                    expect(log.error).toHaveBeenCalled();
                    expect(log.setLevel).toHaveBeenCalledTimes(1);
                    expect(log.setLevel).toHaveBeenCalledWith(LoggerLevelEnum.NONE);
                    done();
                });
        });

        it('should fidjInit KO : without required fidjId', function (done) {

            const srv = new FidjNodeService(_log, _q);
            srv
                .fidjInit(null, {prod: true, logLevel: LoggerLevelEnum.NONE})
                .then(() => {
                    done.fail('should fail');
                })
                .catch(function (err) {
                    expect(err.equals(new FidjError(400, 'Need a fidjId'))).toBeTruthy();
                    done();
                });

        });

        it('should fidjInit KO : reject no connection', function (done) {

            const srv = new FidjNodeService(_log, _q);
            spyOn((srv as any).connection, 'verifyConnectionStates').and.returnValue(_q.reject('no connection'));

            srv
                .fidjInit('testAppWithVerifyReject', {prod: false, logLevel: LoggerLevelEnum.NONE})
                .then(() => {
                    done.fail('should fail');
                })
                .catch(function (err) {
                    expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(1);
                    expect(err.code).toBe(500);
                    expect(err.reason).toBe('no connection');
                    done();
                });

        });

        it('should fidjInit KO : no endpoint at all', function (done) {

            const srv = new FidjNodeService(_log, _q);
            spyOn((srv as any).connection, 'verifyConnectionStates').and.returnValue(_q.resolve());
            spyOn((srv as any).connection, 'getApiEndpoints').and.returnValue(Promise.resolve([]));

            srv
                .fidjInit('testAppWithoutEndpoint')
                .then(() => {
                    done.fail('should fail');
                })
                .catch(function (err) {
                    expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(1);
                    expect((srv as any).connection.getApiEndpoints).toHaveBeenCalledTimes(2);
                    expect(err.equals(new FidjError(404, 'Need one connection - or too old SDK version (check update)'))).toBeTruthy();
                    done();
                });

        });

        it('should fidjInit OK : got old endpoint and is login', function (done) {

            const srv = new FidjNodeService(_log, _q);

            spyOn((srv as any), 'fidjIsLogin').and.returnValue(true);
            spyOn((srv as any).connection, 'verifyConnectionStates').and.returnValue(_q.resolve());
            (srv as any).connection.getApiEndpoints = async (opt: ConnectionFindOptionsInterface) => {
                if (opt.filter === 'theBestOldOne') {
                    return ['foundOneUrlBecause'];
                }
                return [];
            };
            spyOn((srv as any).connection, 'getApiEndpoints').and.callThrough();

            srv
                .fidjInit('testAppWithoutEndpoint')
                .then(() => {
                    expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(1);
                    expect((srv as any).connection.getApiEndpoints).toHaveBeenCalledTimes(2);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });

        });

        it('should fidjInit OK : with endpoints several times (prod or not)', function (done) {

            const srv = new FidjNodeService(_log, _q);
            spyOn((srv as any).connection, 'verifyConnectionStates').and.returnValue(_q.resolve());
            spyOn((srv as any).connection, 'getApiEndpoints').and.returnValue(Promise.resolve(['http://endpoint/mock']));
            spyOn((srv as any).connection, 'setClient').and.returnValue({});

            srv
                .fidjInit('testAppProd')
                .then(function (value) {
                    expect(value).toBeUndefined();
                    expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(1);
                    expect((srv as any).connection.getApiEndpoints).toHaveBeenCalledTimes(2);
                    expect((srv as any).connection.setClient).toHaveBeenCalledTimes(1);
                    return srv.fidjInit('testAppNotProd', {prod: false});
                })
                .then(function (value) {
                    expect(value).toBeUndefined();
                    expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(2);
                    expect((srv as any).connection.getApiEndpoints).toHaveBeenCalledTimes(4);
                    expect((srv as any).connection.setClient).toHaveBeenCalledTimes(2);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });

        });

        it('should fidjLogin KO : without initialisation', async () => {

            const srv = new FidjNodeService(_log, _q);
            try {
                const user = await srv.fidjLogin(_login, _password);
                expect(user).toBeUndefined('because we should catch error');
            } catch (err) {
                expect(err.code).toEqual(404);
                expect(err.reason).toEqual('Need an initialized FidjService');
            }
        });

        it('should fidjLogin OK : without using DB', async () => {

            const srv = new FidjNodeService(_log, _q);
            spyOn((srv as any).connection, 'verifyConnectionStates').and.returnValue(_q.resolve({}));
            spyOn((srv as any).connection, 'getApiEndpoints').and.returnValue(Promise.resolve(['http://endpoint/mock']));
            spyOn((srv as any).connection, 'setClient').and.returnValue({});
            spyOn((srv as any).connection, 'isReady').and.returnValue(true);
            spyOn((srv as any), '_removeAll').and.returnValue(Promise.resolve());
            spyOn((srv as any), '_createSession').and.returnValue(Promise.resolve());
            spyOn((srv as any), '_loginInternal').and.returnValue(Promise.resolve({}));
            spyOn((srv as any).connection, 'setConnection').and.returnValue(Promise.resolve(null))
            spyOn((srv as any).session, 'sync').and.returnValue(Promise.resolve());
            spyOn((srv as any).connection, 'getClientId').and.returnValue('clientId');
            spyOn((srv as any).connection, 'getUser').and.returnValue({id: 'getUser'});

            const value = await srv.fidjInit('testAppProd', {logLevel: LoggerLevelEnum.NONE, prod: false, crypto: false, useDB: false});

            expect(value).toBeUndefined();
            expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.getApiEndpoints).toHaveBeenCalledTimes(2);
            expect((srv as any).connection.setClient).toHaveBeenCalledTimes(1);

            const user = await srv.fidjLogin(_login, _password);

            expect(user.id).toBe('getUser');
            expect((srv as any).connection.isReady).toHaveBeenCalledTimes(1);
            expect((srv as any)._removeAll).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(2);
            expect((srv as any)._createSession).toHaveBeenCalledTimes(1);
            expect((srv as any)._loginInternal).toHaveBeenCalledTimes(1);
            expect((srv as any).session.sync).toHaveBeenCalledTimes(0);
            expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(0);
            expect((srv as any).connection.getUser).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.setConnection).toHaveBeenCalledTimes(1);

        });

        it('should fidjLogin OK', async () => {

            const srv = new FidjNodeService(_log, _q);

            spyOn((srv as any).connection, 'isReady').and.returnValue(true);
            spyOn((srv as any), '_removeAll').and.returnValue(Promise.resolve());
            spyOn((srv as any).connection, 'verifyConnectionStates').and.returnValue(Promise.resolve({}));
            spyOn((srv as any), '_createSession').and.returnValue(Promise.resolve());
            spyOn((srv as any), '_loginInternal').and.returnValue(Promise.resolve({}));
            spyOn((srv as any).connection, 'setConnection').and.returnValue(Promise.resolve(null))
            spyOn((srv as any).session, 'sync').and.returnValue(Promise.resolve());
            spyOn((srv as any).connection, 'getClientId').and.returnValue('clientId');
            spyOn((srv as any).connection, 'getUser').and.returnValue({id: 'getUser'});

            const user = await srv.fidjLogin(_login, _password);

            expect(user.id).toBe('getUser');
            expect((srv as any).connection.isReady).toHaveBeenCalledTimes(1);
            expect((srv as any)._removeAll).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.verifyConnectionStates).toHaveBeenCalledTimes(1);
            expect((srv as any)._createSession).toHaveBeenCalledTimes(1);
            expect((srv as any)._loginInternal).toHaveBeenCalledTimes(1);
            expect((srv as any).session.sync).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.getUser).toHaveBeenCalledTimes(1);
        });

        it('should fidjLoginInDemoMode OK', async () => {

            const srv = new FidjNodeService(_log, _q);

            spyOn((srv as any), '_removeAll').and.returnValue(Promise.resolve());
            spyOn((srv as any).connection, 'setConnectionOffline').and.returnValue(Promise.resolve(null));
            spyOn((srv as any), '_createSession').and.returnValue(Promise.resolve());
            spyOn((srv as any).connection, 'getUser').and.returnValue({id: 'getUser'});
            spyOn(Base64, 'encode').and.returnValue('encoded');

            const user = await srv.fidjLoginInDemoMode()

            expect(user.id).toBe('getUser');

            expect((srv as any).connection.getUser).toHaveBeenCalledTimes(1);
            expect((srv as any)._createSession).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.setConnectionOffline).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.setConnectionOffline).toHaveBeenCalledWith({
                accessToken: 'encoded.encoded.encoded',
                idToken: 'encoded.encoded.encoded',
                refreshToken: 'encoded.encoded.encoded'
            });
            expect(Base64.encode).toHaveBeenCalledTimes(2);
            expect(Base64.encode).toHaveBeenCalledWith('{}');
            // expect(Base64.encode)
            // .toHaveBeenCalledWith('{"roles":[],"message":"demo","endpoints":{},"dbs":[],"exp":1520541290848}');

        });

        it('should fidjLogout OK : without initialisation', function (done) {

            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection = {
                getClient: () => {
                }
            };
            spyOn((srv as any).connection, 'getClient').and.returnValue(false);
            spyOn((srv as any), '_removeAll').and.returnValue(Promise.resolve());
            srv
                .fidjLogout()
                .then(() => {
                    expect((srv as any).connection.getClient).toHaveBeenCalledTimes(1);
                    expect((srv as any)._removeAll).toHaveBeenCalledTimes(1);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });
        });

        it('should fidjLogout OK : without initialisation and with Forced', function (done) {

            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection = {
                getClient: () => {
                },
                logout: () => {
                }
            };
            spyOn((srv as any).connection, 'getClient').and.returnValue(false);
            spyOn((srv as any).connection, 'logout').and.returnValue(Promise.resolve());
            spyOn((srv as any), '_removeAll').and.returnValue(Promise.resolve());
            srv
                .fidjLogout(true)
                .then(() => {
                    expect((srv as any).connection.getClient).toHaveBeenCalledTimes(1);
                    expect((srv as any)._removeAll).toHaveBeenCalledTimes(1);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });
        });

        it('should fidjLogout OK', function (done) {

            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection.fidjId = 'mockedId';
            spyOn((srv as any).connection, 'getClient').and.returnValue({exist: true});
            spyOn((srv as any), '_removeAll').and.returnValue(Promise.resolve());
            spyOn((srv as any).connection, 'logout').and.returnValue(Promise.resolve());
            spyOn((srv as any).session, 'create').and.returnValue(Promise.resolve());
            srv
                .fidjLogout()
                .then(() => {
                    expect((srv as any).session.create).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.create).toHaveBeenCalledWith('mockedId', true);
                    expect((srv as any).connection.getClient).toHaveBeenCalledTimes(1);
                    expect((srv as any)._removeAll).toHaveBeenCalledTimes(1);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });
        });

        it('should fidjSync OK : without connection', function (done) {
            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection.fidjId = 'mockedId';
            spyOn((srv as any).connection, 'getDBs').and.returnValue([]);
            spyOn((srv as any).session, 'setRemote').and.returnValue(null);
            spyOn((srv as any).session, 'create').and.returnValue(Promise.resolve(null));
            spyOn((srv as any).session, 'sync').and.returnValue(Promise.reject(new FidjError(408, 'no remote')));
            spyOn((srv as any).connection, 'getClientId').and.returnValue('clientId');
            spyOn((srv as any).session, 'isEmpty').and.returnValue(Promise.resolve(true));
            spyOn((srv as any).session, 'info').and.returnValue(Promise.resolve({doc_count: 2}));
            spyOn((srv as any).connection, 'refreshConnection').and.returnValue(null);

            const launchIfEmpty = createSpy();

            srv
                .fidjSync(launchIfEmpty, 'noArg')
                .then(() => {
                    expect(launchIfEmpty).toHaveBeenCalledTimes(1);
                    expect(launchIfEmpty).toHaveBeenCalledWith('noArg');

                    expect((srv as any).connection.getDBs).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.setRemote).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.create).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.create).toHaveBeenCalledWith('mockedId');
                    expect((srv as any).session.sync).toHaveBeenCalledTimes(1);
                    expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.isEmpty).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.info).toHaveBeenCalledTimes(1);
                    expect((srv as any).connection.refreshConnection).toHaveBeenCalledTimes(1);


                    expect((srv as any).session.dbLastSync).toBeLessThanOrEqual(new Date().getTime());
                    expect((srv as any).session.dbRecordCount).toBe(2);

                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });

        });

        it('should fidjSync KO : with a fail emptyFn', async () => {
            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection.fidjId = 'mockedId';
            spyOn((srv as any).connection, 'getDBs').and.returnValue([]);
            spyOn((srv as any).session, 'setRemote').and.returnValue(null);
            spyOn((srv as any).session, 'create').and.returnValue(Promise.resolve(null));
            spyOn((srv as any).session, 'sync').and.returnValue(Promise.resolve(null));
            spyOn((srv as any).connection, 'getClientId').and.returnValue('clientId');
            spyOn((srv as any).session, 'isEmpty').and.returnValue(Promise.resolve(true));
            spyOn((srv as any).session, 'isReady').and.returnValue(true);
            spyOn((srv as any).session, 'info').and.returnValue(Promise.resolve({doc_count: 2}));
            spyOn((srv as any).connection, 'refreshConnection').and.returnValue(null);

            const mock = {
                launchIfEmpty: (arg) => {
                    return srv.fidjPutInDb('test');
                }
            };
            spyOn(mock, 'launchIfEmpty').and.callThrough();

            try {
                await srv.fidjSync(mock.launchIfEmpty, 'oneArg');
                expect('fail').toBeUndefined();
            } catch (err) {

                expect(err.code).toBe(408);
                expect(err.reason).toBe('need db');
                expect(mock.launchIfEmpty).toHaveBeenCalledTimes(1);
                expect(mock.launchIfEmpty).toHaveBeenCalledWith('oneArg');

                expect((srv as any).connection.getDBs).toHaveBeenCalledTimes(1);
                expect((srv as any).session.setRemote).toHaveBeenCalledTimes(1);
                expect((srv as any).session.create).toHaveBeenCalledTimes(1);
                expect((srv as any).session.create).toHaveBeenCalledWith('mockedId');
                expect((srv as any).session.sync).toHaveBeenCalledTimes(1);
                expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(3);
                expect((srv as any).session.isEmpty).toHaveBeenCalledTimes(1);
                expect((srv as any).session.isReady).toHaveBeenCalledTimes(1);
            }

        });

        it('should fidjSync OK', async () => {
            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection.fidjId = 'mockedId';
            spyOn((srv as any).connection, 'getDBs').and.returnValue([]);
            spyOn((srv as any).session, 'setRemote').and.returnValue(null);
            spyOn((srv as any).session, 'create').and.returnValue(Promise.resolve(null));
            spyOn((srv as any).session, 'sync').and.returnValue(Promise.resolve(null));
            spyOn((srv as any).connection, 'getClientId').and.returnValue('clientId');
            spyOn((srv as any).session, 'isEmpty').and.returnValue(Promise.resolve(true));
            spyOn((srv as any).session, 'isReady').and.returnValue(true);
            spyOn((srv as any).session, 'info').and.returnValue(Promise.resolve({doc_count: 2}));
            spyOn((srv as any).connection, 'refreshConnection').and.returnValue(null);

            const mock = {
                launchIfEmpty: (arg) => {
                    return 'success';
                }
            };
            spyOn(mock, 'launchIfEmpty').and.callThrough();

            await srv.fidjSync(mock.launchIfEmpty, 'oneArg');

            expect(mock.launchIfEmpty).toHaveBeenCalledTimes(1);
            expect(mock.launchIfEmpty).toHaveBeenCalledWith('oneArg');

            expect((srv as any).connection.getDBs).toHaveBeenCalledTimes(1);
            expect((srv as any).session.setRemote).toHaveBeenCalledTimes(1);
            expect((srv as any).session.create).toHaveBeenCalledTimes(1);
            expect((srv as any).session.create).toHaveBeenCalledWith('mockedId');
            expect((srv as any).session.sync).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(1);
            expect((srv as any).session.isEmpty).toHaveBeenCalledTimes(1);
            expect((srv as any).session.isReady).toHaveBeenCalledTimes(0);
            expect((srv as any).session.info).toHaveBeenCalledTimes(1);
            expect((srv as any).connection.refreshConnection).toHaveBeenCalledTimes(1);
            expect((srv as any).session.dbLastSync).toBeLessThanOrEqual(new Date().getTime());
            expect((srv as any).session.dbRecordCount).toBe(2);
        });

        it('should fidjRemoveInDb TODO', function (done) {

            done();
            // done.fail('todo');
        });

        it('should fidjPutInDb & fidjFindInDb & fidjFindAllInDb OK', function (done) {
            const srv = new FidjNodeService(_log, _q);
            (srv as any).connection.fidjId = 'mockedId';
            spyOn((srv as any).connection, 'getClientId').and.returnValue('id');
            spyOn((srv as any).session, 'isReady').and.returnValue(true);
            spyOn((srv as any).session, 'put').and.returnValue(Promise.resolve('ok'));
            spyOn((srv as any), '_generateObjectUniqueId').and.returnValue('uid');
            srv
                .fidjPutInDb('testDataToEncrypt')
                .then(function (value) {
                    expect(value).toBe('ok');
                    expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(2);
                    expect((srv as any).session.isReady).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.put).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.put).toHaveBeenCalledWith(
                        'testDataToEncrypt',
                        'uid',
                        'id',
                        'fidj',
                        undefined, undefined);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });
        });

        it('should fidjPutInDb with fidjCrypto OK', function (done) {
            const srv = new FidjNodeService(_log, _q);
            spyOn((srv as any).connection, 'getClientId').and.returnValue('id');
            spyOn((srv as any).session, 'isReady').and.returnValue(true);
            spyOn((srv as any).session, 'put').and.returnValue(Promise.resolve('ok'));
            spyOn((srv as any), '_generateObjectUniqueId').and.returnValue('uid');
            (srv as any).connection.fidjCrypto = true;
            let crypto: SessionCryptoInterface;
            crypto = {
                obj: (srv as any).connection,
                method: 'encrypt'
            };

            srv
                .fidjPutInDb('testDataToEncrypt')
                .then(function (value) {
                    expect(value).toBe('ok');
                    expect((srv as any).connection.getClientId).toHaveBeenCalledTimes(2);
                    expect((srv as any).session.isReady).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.put).toHaveBeenCalledTimes(1);
                    expect((srv as any).session.put).toHaveBeenCalledWith(
                        'testDataToEncrypt',
                        'uid',
                        'id',
                        'fidj',
                        undefined,
                        crypto);
                    done();
                })
                .catch(function (err) {
                    done.fail(err);
                });
        });

        it('should fidjGetEndpoints', async () => {

            let accessPayload;
            let filter: EndpointFilterInterface;
            const srv = new FidjNodeService(_log, _q);
            const getAccessPayload = spyOn((srv as any).connection, 'getAccessPayload');

            // bad endpoints
            accessPayload = {endpoints: {}};
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints()).length).toBe(0);

            // empty endpoints & no filter
            accessPayload = {endpoints: []};
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints()).length).toBe(0);

            // 2 endpoints & no filter
            accessPayload = {
                endpoints: [
                    {key: 'my endpoint1', url: 'http://test1.com'},
                    {key: 'my endpoint2', url: 'http://test2.com'}]
            };
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints()).length).toBe(2);
            expect(JSON.stringify(await srv.fidjGetEndpoints())).toBe(JSON.stringify(accessPayload.endpoints));

            // 3 endpoints , one blocked & no filter (showBlocked = false by default)
            accessPayload = {
                endpoints: [
                    {key: 'my endpoint1', url: 'http://test1.com'},
                    {key: 'my endpoint2', url: 'http://test2.com', blocked: true},
                    {key: 'my endpoint3', url: 'http://test3.com', blocked: false}]
            };
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints()).length).toBe(2);
            expect((await srv.fidjGetEndpoints())[1].key).toBe('my endpoint3');
            expect(!(await srv.fidjGetEndpoints())[1].blocked).toBe(true);

            // 3 endpoints , one blocked & filter on key (showBlocked = false by default)
            filter = {key: 'my endpoint3'};
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints(filter)).length).toBe(1);
            expect((await srv.fidjGetEndpoints(filter))[0].key).toBe('my endpoint3');
            expect(!(await srv.fidjGetEndpoints(filter))[0].blocked).toBe(true);

            // 3 endpoints , one blocked & filter on key blocked (showBlocked = false by default)
            filter = {key: 'my endpoint2'};
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints(filter)).length).toBe(0);

            // 3 endpoints , one blocked & filter bypass showBlocked
            filter = {showBlocked: true};
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints(filter)).length).toBe(3);
            expect((await srv.fidjGetEndpoints(filter))[1].key).toBe('my endpoint2');
            expect(!(await srv.fidjGetEndpoints(filter))[1].blocked).toBe(false);

            // 3 endpoints , one blocked & filter on key and bypass showBlocked
            filter = {key: 'my endpoint2', showBlocked: true};
            getAccessPayload.and.returnValue(JSON.stringify(accessPayload));
            expect((await srv.fidjGetEndpoints(filter)).length).toBe(1);
            expect((await srv.fidjGetEndpoints(filter))[0].key).toBe('my endpoint2');
            expect(!(await srv.fidjGetEndpoints(filter))[0].blocked).toBe(false);

        });

        it('should fidjSendOnEndpoint KO : 400 without valid endpoint', function (done) {

            let accessPayload;
            const srv = new FidjNodeService(_log, _q);
            const getAccessPayload = spyOn((srv as any).connection, 'getAccessPayload');

            // no endpoint -> catch error
            accessPayload = {endpoints: []};
            getAccessPayload.and.returnValue(Promise.resolve(JSON.stringify(accessPayload)));
            srv.fidjSendOnEndpoint({key: 'none', verb: 'POST', relativePath: '/', data: {}})
                .then(() => done.fail('should fail'))
                .catch((err: ErrorInterface) => {
                    expect(err.code).toBe(400);
                    expect(err.reason).toBe('fidj.sdk.service.fidjSendOnEndpoint : endpoint does not exist.');
                    done();
                });
        });

        it('should fidjSendOnEndpoint OK : without valid endpoint but defaultKeyUrl', async (done) => {

            const MOCKED_RESPONSE = 'mocked response';
            jasmine.Ajax.stubRequest(/.*test*/).andReturn(
                {
                    status: 200,
                    contentType: 'text/plain',
                    responseText: MOCKED_RESPONSE
                }
            );

            let accessPayload;
            const srv = new FidjNodeService(_log, _q);
            const getAccessPayload = spyOn((srv as any).connection, 'getAccessPayload');
            spyOn((srv as any).connection, 'getIdToken').and.returnValue(Promise.resolve('aFakeJwt'));

            // 3 endpoints , one blocked & no filter (showBlocked = false by default)
            accessPayload = {endpoints: []};
            getAccessPayload.and.returnValue(Promise.resolve(JSON.stringify(accessPayload)));

            // => call and expect a default
            const result = await srv.fidjSendOnEndpoint({
                key: 'none', verb: 'POST', relativePath: '/', data: {mock: true},
                defaultKeyUrl: 'http://test1.com'
            });

            expect(result).toBe(MOCKED_RESPONSE);
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('http://test1.com/');

            // expect(request.requestHeaders.Authorization).toBe('Bearer aFakeJwt');
            expect(request.requestHeaders.Authorization).toBe('Bearer aFakeJwt');
        });

        it('should fidjSendOnEndpoint OK', async () => {

            const MOCKED_RESPONSE = 'mocked response';
            jasmine.Ajax.stubRequest(/.*test*/).andReturn(
                {
                    status: 200,
                    contentType: 'text/plain',
                    responseText: MOCKED_RESPONSE
                }
            );

            let accessPayload;
            const srv = new FidjNodeService(_log, _q);
            const getAccessPayload = spyOn((srv as any).connection, 'getAccessPayload');
            spyOn((srv as any).connection, 'getIdToken').and.returnValue(Promise.resolve('aFakeJwt'));

            // 3 endpoints , one blocked & no filter (showBlocked = false by default)
            accessPayload = {
                endpoints: [
                    {key: 'my endpoint1', url: 'http://test1.com'},
                    {key: 'my endpoint2', url: 'http://test2.com', blocked: true},
                    {key: 'my endpoint3', url: 'http://test3.com', blocked: false}]
            };
            getAccessPayload.and.returnValue(Promise.resolve(JSON.stringify(accessPayload)));
            const result = await srv.fidjSendOnEndpoint({key: 'my endpoint1', verb: 'POST', relativePath: '/', data: {mock: true}});
            expect(result).toBe(MOCKED_RESPONSE);
            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('http://test1.com/');

            // expect(request.requestHeaders.Authorization).toBe('Bearer aFakeJwt');
            expect(request.requestHeaders.Authorization).toBe('Bearer aFakeJwt');
        });

        it('should _loginInternal KO : without initialisation', async () => {

            const srv = new FidjNodeService(_log, _q);
            try {
                const user = await (srv as any)._loginInternal(_login, _password, _updateProperties)
                expect(user).toBeUndefined('because we should catch error');
            } catch (err) {
                expect(err.code).toBe(403);
                expect(err.reason).toBe('Need an initialized FidjService');
            }
        });

        it('should _generateObjectUniqueId', () => {

            const srv = new FidjNodeService(_log, _q);
            const id = (srv as any)._generateObjectUniqueId('appName', 'Type', 'Name');
            expect(id.indexOf('aTypeName20')).toBe(0);

            const id2 = (srv as any)._generateObjectUniqueId('appName', 'type', 'name');
            expect(id2).not.toBe(id);
        });

        it('should fidjForgotPasswordRequest', async () => {
            jasmine.Ajax.stubRequest(/.*forgot*/).andReturn(
                {
                    status: 204,
                    contentType: 'text/plain',
                    responseText: ''
                }
            );
            const srv = new FidjNodeService(_log, _q);

            await srv.fidjForgotPasswordRequest('email');

            const request = jasmine.Ajax.requests.mostRecent();
            expect(request.url).toBe('http://localhost:3201/v3/me/forgot');
            expect(request.params).toBe('{"email":"email"}');

        });
    });

});
