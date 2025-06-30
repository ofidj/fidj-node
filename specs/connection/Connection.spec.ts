import {assert, expect, spy, use} from 'chai';
import spies from 'chai-spies';
import axios from 'axios';
import {
    Ajax,
    Base64,
    Client,
    ClientToken,
    ClientTokens,
    ClientUser,
    Connection,
    LoggerInterface,
    LoggerLevelEnum,
    LoggerService,
    XhrErrorReason,
} from '../../src';

use(spies);

describe('Connection', () => {
    describe('Ajax', () => {
        const _dogName = 'dog' + Math.floor(Math.random() * 5000);
        const _dogData = JSON.stringify({type: 'dog', name: _dogName});
        const _dogURI = 'https://api.fidj.com/yourorgname/sandbox/dogs';

        beforeEach(() => {
            // No need for jasmine.Ajax.install() or jasmine.clock().install()
            // We'll use chai-spies to mock axios directly
        });
        afterEach(() => {
            // Restore all spies
            spy.restore();
        });

        it('should POST to a URI', async () => {
            const mockResponse = {
                status: 200,
                data: _dogName,
            };
            spy.on(axios, 'post', async (returns) => mockResponse);

            const response = await new Ajax().post({url: _dogURI, data: _dogData});

            // Verify axios.post was called with the right arguments
            expect(axios.post).to.have.been.called.with(_dogURI, _dogData, {
                headers: undefined,
            });

            // Verify the response data
            expect(response.data).to.equal(_dogName);
        });

        it('should POST to a URI as json', (done) => {
            const jsonData = {name: _dogName};
            // Mock axios.post to return a successful response with JSON data
            const mockResponse = {
                status: 200,
                data: JSON.stringify(jsonData),
            };
            spy.on(axios, 'post', (returns) => Promise.resolve(mockResponse));

            new Ajax()
                .post({
                    url: _dogURI,
                    data: jsonData,
                    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
                })
                .then((response) => {
                    // Verify axios.post was called with the right arguments
                    expect(axios.post).to.have.been.called.with(_dogURI, JSON.stringify(jsonData), {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                    });

                    // Verify the response data
                    expect(response.data.name).to.equal(_dogName);
                    done();
                })
                .catch((err) => {
                    fail(err.toString());
                });
        });

        it('should GET a URI', (done) => {
            // Mock axios.get to return a successful response
            const mockResponse = {
                status: 200,
                data: _dogName,
            };
            spy.on(axios, 'get', (returns) => Promise.resolve(mockResponse));

            new Ajax()
                .get({url: _dogURI + '/' + _dogName})
                .then((response) => {
                    // Verify axios.get was called with the right arguments
                    expect(axios.get).to.have.been.called.with(_dogURI + '/' + _dogName, {
                        headers: undefined,
                    });

                    // Verify the response data
                    expect(response.data).to.equal(_dogName);
                    done();
                })
                .catch((err) => {
                    fail(err.toString());
                });
        });

        it('should PUT to a URI', (done) => {
            // Mock axios.put to return a successful response
            const mockResponse = {
                status: 202,
                data: _dogName,
            };
            spy.on(axios, 'put', (returns) => Promise.resolve(mockResponse));

            new Ajax()
                .put({url: _dogURI + '/' + _dogName, data: {favorite: true}})
                .then((response) => {
                    // Verify axios.put was called with the right arguments
                    expect(axios.put).to.have.been.called.with(
                        _dogURI + '/' + _dogName,
                        JSON.stringify({favorite: true}),
                        {headers: undefined}
                    );

                    // Verify the response data
                    expect(response.data).to.equal(_dogName);
                    done();
                })
                .catch((err) => {
                    fail(err.toString());
                });
        });

        it('should DELETE a URI', (done) => {
            // Mock axios.delete to return a successful response
            const mockResponse = {
                status: 204,
                data: _dogName,
            };
            spy.on(axios, 'delete', (returns) => Promise.resolve(mockResponse));

            new Ajax()
                .delete({url: _dogURI + '/' + _dogName, data: _dogData})
                .then((response) => {
                    // Verify axios.delete was called with the right arguments
                    expect(axios.delete).to.have.been.called.with(_dogURI + '/' + _dogName, {
                        headers: undefined,
                    });

                    // Verify the response data
                    expect(response.data).to.equal(_dogName);
                    done();
                })
                .catch((err) => {
                    fail(err.toString());
                });
        });

        it('should POST fail due to timeout (408) on fake url', async () => {
            // Mock axios.post to throw an error with status 408
            const mockError = {
                status: 408,
                response: {
                    status: 408,
                },
            };
            spy.on(axios, 'post', (returns) => Promise.reject(mockError));

            try {
                await new Ajax().post({url: _dogURI, data: _dogData});
                // If we get here, the test should fail
                assert.fail('Expected an error but none was thrown');
            } catch (err) {
                expect(err.code).to.equal(408);
                expect(err.reason).to.equal(XhrErrorReason.STATUS);
            }
        });

        it('should GET fail due to error (500) on failing service', (done) => {
            // Mock axios.get to throw an error with status 500
            const mockError = {
                status: 500,
                response: {
                    status: 500,
                },
            };
            spy.on(axios, 'get', (returns) => Promise.reject(mockError));

            new Ajax()
                .get({url: _dogURI + '/' + _dogName})
                .then((response) => {
                    fail('Should have failed but succeeded with: ' + JSON.stringify(response));
                })
                .catch((err) => {
                    expect(err.reason).to.equal(XhrErrorReason.STATUS);
                    expect(err.code).to.equal(500);
                    done();
                });
        });

        it('should POST fail due to 404', (done) => {
            // Mock axios.post to return a 404 response
            const mockResponse = {
                status: 404,
                data: '404?',
            };
            spy.on(axios, 'post', (returns) => Promise.resolve(mockResponse));

            new Ajax()
                .post({url: _dogURI, data: _dogData})
                .then((response) => {
                    fail('Should have failed but succeeded with: ' + JSON.stringify(response));
                })
                .catch((err) => {
                    expect(err.reason).to.equal(XhrErrorReason.STATUS);
                    expect(err.status).to.equal(404);
                    expect(err.code).to.equal(404);
                    done();
                });
        });

        it('should GET fail due to 404', (done) => {
            // Mock axios.get to return a 404 response
            const mockResponse = {
                status: 404,
                data: '404?',
            };
            spy.on(axios, 'get', (returns) => Promise.resolve(mockResponse));

            new Ajax()
                .get({url: _dogURI + '/' + _dogName})
                .then((response) => {
                    fail('Should have failed but succeeded with: ' + JSON.stringify(response));
                })
                .catch((err) => {
                    expect(err.reason).to.equal(XhrErrorReason.STATUS);
                    expect(err.status).to.equal(404);
                    expect(err.code).to.equal(404);
                    done();
                });
        });
    });

    describe('Client', () => {
        const _appId = 'clientTest';
        const _uri = 'http://client';
        const _sdk: any = {};
        const _storage: any = {
            get: (key) => {},
            set: (key) => {},
            remove: (key) => {},
        };
        const _logger: any = {
            log: () => {},
            error: () => {},
            warn: () => {},
            debug: () => {},
        };

        beforeEach(() => {
            // No need for jasmine.Ajax.install()
            // We'll use chai-spies to mock axios directly
        });
        afterEach(() => {
            // Restore all spies
            spy.restore();
        });

        it('should login', (done) => {
            const userJson = {user: {id: '1234'}};
            const tokenJson = {token: {id: '1234'}};

            // Mock axios.post for user request
            const userResponse = {
                status: 200,
                data: JSON.stringify(userJson),
            };

            // Mock axios.post for token request
            const tokenResponse = {
                status: 200,
                data: JSON.stringify(tokenJson),
            };

            // Set up the spy to return different responses based on the URL
            spy.on(axios, 'post', (url, data, options) => {
                if (url.includes('users')) {
                    return Promise.resolve(userResponse);
                } else if (url.includes('tokens')) {
                    return Promise.resolve(tokenResponse);
                }
                return Promise.reject(new Error('Unexpected URL: ' + url));
            });

            const client = new Client(_appId, _uri, _storage, _sdk, _logger);
            expect(client).to.exist;

            // Spy on setClientId
            spy.on(client, 'setClientId');

            client
                .login('', '')
                .then((user) => {
                    expect(user).to.exist;
                    const ready = client.isReady();
                    expect(ready).to.be.true;
                    expect(client.setClientId).to.have.been.called.exactly(1);
                    expect(client.setClientId).to.have.been.called.with('');

                    // Verify axios.post was called with the right URL
                    expect(axios.post).to.have.been.called();

                    done();
                })
                .catch((err) => {
                    fail(err.toString());
                });
        });

        xit('should reAuthenticate', async () => {
            const tokenJson = {token: {id: '1234', type: 'refresh_token', data: 'data1234'}};

            // Mock axios.post for token request
            const tokenResponse = {
                status: 200,
                data: JSON.stringify(tokenJson),
            };

            // Set up the spy to capture the request data
            let requestData1: any, requestData2: any;
            spy.on(axios, 'post', (url, data, options) => {
                if (!requestData1) {
                    requestData1 = data;
                } else {
                    requestData2 = data;
                }
                return Promise.resolve(tokenResponse);
            });

            const client = new Client(_appId, _uri, _storage, _sdk, _logger);
            expect(client).to.exist;

            let user = await client.reAuthenticate('refreshToken');

            expect(user).to.exist;
            const ready = client.isReady();
            expect(ready).to.be.true;

            // Verify axios.post was called with the right URL
            expect(axios.post).to.have.been.called();

            // Parse the request data and verify it
            const data1 = JSON.parse(requestData1);
            expect(data1).to.exist;
            expect(data1.grant_type).to.equal('refresh_token');
            expect(data1.refresh_token).to.equal('refreshToken');
            expect(data1.refreshCount).to.equal(1);

            // Call reAuthenticate again
            user = await client.reAuthenticate('refreshToken');

            // Verify axios.post was called again
            expect(axios.post).to.have.been.called.exactly(2);

            // Parse the second request data and verify it
            const data2 = JSON.parse(requestData2);
            expect(data2.refresh_token).to.equal('refreshToken');
            expect(data2.refreshCount).to.equal(2);
        });

        xit('should logout', async () => {
            const responseJson = {ok: 'done'};

            // Mock axios.delete for token request
            const deleteResponse = {
                status: 204,
                data: JSON.stringify(responseJson),
            };

            // Set up the spy to capture the request data
            let requestParams: any;
            spy.on(axios, 'delete', (url, options) => {
                requestParams = options.data;
                return Promise.resolve(deleteResponse);
            });

            const client = new Client(_appId, _uri, _storage, _sdk, _logger);
            expect(client).to.exist;
            client.clientId = 'clientMockAsConnected';

            // Spy on storage.remove
            spy.on(_storage, 'remove', (returns) => true);

            const user = await client.logout('tokenMockAsConnected');

            expect(JSON.stringify(user)).to.equal(JSON.stringify(responseJson));
            const ready = client.isReady();
            expect(ready).to.be.true;

            // Verify axios.delete was called with the right URL
            expect(axios.delete).to.have.been.called();

            // Verify the request data
            expect(requestParams).to.be.null;

            // Verify storage.remove was called correctly
            expect(_storage.remove).to.have.been.called.exactly(2);
            expect(_storage.remove).to.have.been.called.with('v2.clientId');
            // expect(_storage.remove).to.have.been.called.with('v2.clientUuid');
            expect(_storage.remove).to.have.been.called.with('v2.refreshCount');
        });
    });

    xdescribe('Connection', () => {
        const _sdk: any = {version: 'mock.sdk'};
        const _storage: any = {
            get: (key) => {},
            set: (key) => {},
            remove: (key) => {},
        };
        const _log: LoggerInterface = new LoggerService(LoggerLevelEnum.NONE);
        const mocks = {
            tokens: {
                withoutAnyUrl: 'begin.' + Base64.encode(JSON.stringify({})) + '.end',
                withDbs:
                    'begin.' +
                    Base64.encode(
                        JSON.stringify({
                            dbs: [{url: 'http://db1'}, {url: 'http://db2'}],
                        })
                    ) +
                    '.end',
                withApis01:
                    'begin.' +
                    Base64.encode(
                        JSON.stringify({
                            apis: [{url: 'http://api_1'}, {url: 'http://api_2'}],
                        })
                    ) +
                    '.end',
                withApis02:
                    'begin.' +
                    Base64.encode(
                        JSON.stringify({
                            apis: [{url: 'http://api_3'}, {url: 'http://api_4'}],
                        })
                    ) +
                    '.end',
            },
        };

        beforeEach(() => {
            // No need for jasmine.Ajax.install()
            // We'll use chai-spies to mock axios directly
        });
        afterEach(() => {
            // Restore all spies
            spy.restore();
        });

        it('should isLogin', () => {
            const cx = new Connection(_sdk, _storage, _log);
            expect(cx).to.exist;

            let i = cx.isLogin();
            expect(i).to.be.false;

            const payloadNotExpired = Base64.encode(
                JSON.stringify({exp: (new Date().getTime() + 200) / 1000})
            );
            (cx as any).refreshToken = '.' + payloadNotExpired + '.';
            i = cx.isLogin();
            expect(i).to.be.true;
        });

        it('should isReady', () => {
            const cx = new Connection(_sdk, _storage, _log);
            let i = cx.isReady();
            expect(i).to.be.false;

            (cx as any).client = {
                isReady: () => true,
            };
            i = cx.isReady();
            expect(i).to.be.true;
        });

        it('should getIdPayload & getAccessPayload', async () => {
            const cx = new Connection(_sdk, _storage, _log);

            let payload = await cx.getIdPayload();
            expect(payload).to.be.null;
            payload = await cx.getAccessPayload();
            expect(payload).to.be.null;

            (cx as any).accessToken = 'fake.fake.fake';
            (cx as any).idToken = 'fake.fake.fake';
            payload = await cx.getIdPayload();
            expect(payload).to.be.null;
            payload = await cx.getAccessPayload();
            expect(payload).to.be.null;

            (cx as any).accessToken = 'fake.fake.fake';
            (cx as any).idToken = 'fake.fake.fake';
            payload = await cx.getIdPayload({mock: true});
            expect(payload).to.equal(JSON.stringify({mock: true}));
            payload = await cx.getAccessPayload(JSON.stringify({mock: true}));
            expect(payload).to.equal(JSON.stringify({mock: true}));

            (cx as any).accessToken = 'fake.fake.fake';
            (cx as any).idToken = 'fake.fake.fake';
            payload = await cx.getIdPayload('fakeTest');
            expect(payload).to.equal('fakeTest');
            payload = await cx.getAccessPayload('fakeTest');
            expect(payload).to.equal('fakeTest');

            (cx as any).accessToken = '';
            (cx as any).idToken = '';
            payload = await cx.getIdPayload('emptyTest');
            expect(payload).to.equal('emptyTest');
            payload = await cx.getAccessPayload('emptyTest');
            expect(payload).to.equal('emptyTest');

            // a real one
            const realHF = {};
            const realValue1 = {
                test: true,
                apis: [
                    {key: '', url: 'http://api11', blocked: false},
                    {key: '', url: 'http://api12', blocked: false},
                    {key: '', url: 'http://api13', blocked: false},
                ],
            };
            const realValue2 = {test: true, apis: ['http://api21', 'http://api22', 'http://api23']};
            const hf = Base64.encode(JSON.stringify(realHF));
            const payload1 = Base64.encode(JSON.stringify(realValue1));
            const payload2 = Base64.encode(JSON.stringify(realValue2));
            const token1 = '' + hf + '.' + payload1 + '.' + hf;
            const token2 = '' + hf + '.' + payload2 + '.' + hf;
            // console.log('token1: ', token1);
            // console.log('token2: ', token2);
            (cx as any).accessToken = token1;
            (cx as any).idToken = token2;
            payload = await cx.getAccessPayload();
            expect(payload).to.equal(JSON.stringify(realValue1));
            payload = await cx.getIdPayload();
            expect(payload).to.equal(JSON.stringify(realValue2));
        });

        it('should setConnection', async () => {
            const cx = new Connection(_sdk, _storage, _log);
            spy.on(cx, 'setUser');
            spy.on((cx as any)._storage, 'set', (returns) => ({}));

            const clientTokens = new ClientTokens(
                'test',
                new ClientToken('test1Id', 'idToken', 'test1data'),
                new ClientToken('test2Id', 'accessToken', 'test2data'),
                new ClientToken('test3Id', 'refreshToken', 'test3data')
            );
            await cx.setConnection(clientTokens);
            expect(cx.setUser).to.have.been.called.exactly(1);
            expect(cx.setUser).to.have.been.called.with(new ClientUser('test', 'test', []));
            expect((cx as any)._storage.set).to.have.been.called.exactly(4);
            expect((cx as any)._storage.set).to.have.been.called.with(
                'v2.accessToken',
                'test1data'
            );
            expect((cx as any)._storage.set).to.have.been.called.with('v2.idToken', 'test2data');
            expect((cx as any)._storage.set).to.have.been.called.with(
                'v2.refreshToken',
                'test3data'
            );
        });

        it('should setConnectionOffline', async () => {
            const cx = new Connection(_sdk, _storage, _log);
            spy.on(cx, 'setUser');
            spy.on((cx as any)._storage, 'set', (returns) => ({}));

            await cx.setConnectionOffline({
                accessToken: 'test1',
                idToken: 'test2',
                refreshToken: 'test3',
            });
            expect(cx.setUser).to.have.been.called.exactly(1);
            expect(cx.setUser).to.have.been.called.with(new ClientUser('demo', 'demo', []));
            expect((cx as any)._storage.set).to.have.been.called.exactly(3);
        });

        it('should getApiEndpoints', async () => {
            const srv = new Connection(_sdk, _storage, _log);

            // without initialisation : default endpoints
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://localhost:3201/v3');
            expect((await srv.getApiEndpoints())[1].url).to.equal(
                'https://api.sandbox.fidj.ovh/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );

            // with corrupted access_token endpoints : default endpoints
            (srv as any).accessToken = 'aaa.bbb.ccc';
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://localhost:3201/v3');
            expect((await srv.getApiEndpoints())[1].url).to.equal(
                'https://api.sandbox.fidj.ovh/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );

            // with access_token without endpoints : default endpoints
            (srv as any).accessToken = mocks.tokens.withoutAnyUrl;
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://localhost:3201/v3');
            expect((await srv.getApiEndpoints())[1].url).to.equal(
                'https://api.sandbox.fidj.ovh/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );

            // with valid access_token endpoints : valid new enpoints
            (srv as any).accessToken = mocks.tokens.withApis01;
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[1].url).to.equal('http://api_2');
            expect((await srv.getApiEndpoints({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://api_1'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://api_1'
            );

            // with states only ok for the last one
            (srv as any).states = {
                'http://api_1': {state: false, time: 0, lastTimeWasOk: 2},
                'http://api_2': {state: true, time: 0, lastTimeWasOk: 2},
            };
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://api_2'
            );

            // with states only ok for the last one
            (srv as any).states = {
                'http://api_1': {state: false, time: 0, lastTimeWasOk: 1},
                'http://api_2': {state: false, time: 0, lastTimeWasOk: 2},
                'http://api3': {state: true, time: 0, lastTimeWasOk: 0},
            };
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[1].url).to.equal('http://api_2');
            // expect((await srv.getApiEndpoints())[2].url).to.equal('http://api3');
            expect((await srv.getApiEndpoints({filter: 'theBestOne'})).length).to.equal(0);
            // expect((await srv.getApiEndpoints({filter: 'theBestOne'})[0].url).to.equal('http://api3');
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://api_2'
            );

            // with other states, could not filter
            (srv as any).states = {
                'http://otherapi1': {state: false, time: 0, lastTimeWasOk: 1},
                'http://otherapi2': {state: false, time: 0, lastTimeWasOk: 2},
                'http://otherapi3': {state: true, time: 0, lastTimeWasOk: 0},
            };
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[1].url).to.equal('http://api_2');
            expect((await srv.getApiEndpoints({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://api_1'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'})).length).to.equal(1);
            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://api_1'
            );
        });

        it('should getApiEndpoints based on accessTokenPrev', async () => {
            const srv = new Connection(_sdk, _storage, _log);

            const previous = mocks.tokens.withApis01;
            const actual = mocks.tokens.withApis02;

            // previous accessToken with valid endpoints
            (srv as any).accessTokenPrevious = previous;
            (srv as any).accessToken = null;
            expect((await srv.getApiEndpoints()).length).to.equal(4);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://localhost:3201/v3');
            expect((await srv.getApiEndpoints())[1].url).to.equal(
                'https://api.sandbox.fidj.ovh/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );
            expect((await srv.getApiEndpoints())[2].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[3].url).to.equal('http://api_2');

            // with corrupted access_token endpoints : default endpoints
            (srv as any).accessTokenPrevious = previous;
            (srv as any).accessToken = 'aaa.bbb.ccc';
            expect((await srv.getApiEndpoints()).length).to.equal(4);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://localhost:3201/v3');
            expect((await srv.getApiEndpoints())[1].url).to.equal(
                'https://api.sandbox.fidj.ovh/v3'
            );
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://localhost:3201/v3'
            );
            expect((await srv.getApiEndpoints())[2].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[3].url).to.equal('http://api_2');

            // with same access_token endpoints : valid same enpoints
            (srv as any).accessTokenPrevious = previous;
            (srv as any).accessToken = previous;
            expect((await srv.getApiEndpoints()).length).to.equal(2);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[1].url).to.equal('http://api_2');
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://api_1'
            );

            // with access_token with new endpoints (new at the beginning)
            (srv as any).accessTokenPrevious = previous;
            (srv as any).accessToken = actual;
            expect((await srv.getApiEndpoints()).length).to.equal(4);
            expect((await srv.getApiEndpoints())[0].url).to.equal('http://api_3');
            expect((await srv.getApiEndpoints())[1].url).to.equal('http://api_4');
            expect((await srv.getApiEndpoints())[2].url).to.equal('http://api_1');
            expect((await srv.getApiEndpoints())[3].url).to.equal('http://api_2');
            expect((await srv.getApiEndpoints({filter: 'theBestOne'}))[0].url).to.equal(
                'http://api_3'
            );

            expect((await srv.getApiEndpoints({filter: 'theBestOldOne'}))[0].url).to.equal(
                'http://api_3'
            );
        });

        it('should getDBs', async () => {
            const srv = new Connection(_sdk, _storage, _log);

            // without initialisation : no DB
            expect((await srv.getDBs()).length).to.equal(0);
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(0);

            // with corrupted access_token endpoints : no DB
            (srv as any).accessToken = 'aaa.bbb.ccc';
            expect((await srv.getDBs()).length).to.equal(0);
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(0);

            // with access_token without endpoints : no DB
            (srv as any).accessToken = mocks.tokens.withoutAnyUrl;
            expect((await srv.getDBs()).length).to.equal(0);
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(0);

            // with valid access_token endpoints : valid new enpoints
            (srv as any).accessToken = mocks.tokens.withDbs;
            expect((await srv.getDBs()).length).to.equal(2);
            expect((await srv.getDBs())[0].url).to.equal('http://db1');
            expect((await srv.getDBs())[1].url).to.equal('http://db2');
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getDBs({filter: 'theBestOne'}))[0].url).to.equal('http://db1');
            expect((await srv.getDBs({filter: 'theBestOnes'})).length).to.equal(2);
            expect((await srv.getDBs({filter: 'theBestOnes'}))[0].url).to.equal('http://db1');
            expect((await srv.getDBs({filter: 'theBestOnes'}))[1].url).to.equal('http://db2');

            // with other endpoints states
            (srv as any).states = {
                'http://otherdb1': {state: true, time: 0, lastTimeWasOk: 1},
                'http://otherdb2': {state: true, time: 0, lastTimeWasOk: 2},
            };
            expect((await srv.getDBs()).length).to.equal(2);
            expect((await srv.getDBs())[0].url).to.equal('http://db1');
            expect((await srv.getDBs())[1].url).to.equal('http://db2');
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getDBs({filter: 'theBestOne'}))[0].url).to.equal('http://db1');
            expect((await srv.getDBs({filter: 'theBestOnes'})).length).to.equal(2);
            expect((await srv.getDBs({filter: 'theBestOnes'}))[0].url).to.equal('http://db1');
            expect((await srv.getDBs({filter: 'theBestOnes'}))[1].url).to.equal('http://db2');

            // with all ok states
            (srv as any).states = {
                'http://db1': {state: true, time: 0, lastTimeWasOk: 1},
                'http://db2': {state: true, time: 0, lastTimeWasOk: 2},
            };
            expect((await srv.getDBs()).length).to.equal(2);
            expect((await srv.getDBs())[0].url).to.equal('http://db1');
            expect((await srv.getDBs())[1].url).to.equal('http://db2');
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getDBs({filter: 'theBestOne'}))[0].url).to.equal('http://db1');
            expect((await srv.getDBs({filter: 'theBestOnes'})).length).to.equal(2);
            expect((await srv.getDBs({filter: 'theBestOnes'}))[0].url).to.equal('http://db1');
            expect((await srv.getDBs({filter: 'theBestOnes'}))[1].url).to.equal('http://db2');

            // with states only ok for the last one
            (srv as any).states = {
                'http://db1': {state: false, time: 0, lastTimeWasOk: 1},
                'http://db2': {state: true, time: 0, lastTimeWasOk: 2},
            };
            expect((await srv.getDBs()).length).to.equal(2);
            expect((await srv.getDBs())[0].url).to.equal('http://db1');
            expect((await srv.getDBs())[1].url).to.equal('http://db2');
            expect((await srv.getDBs({filter: 'theBestOne'})).length).to.equal(1);
            expect((await srv.getDBs({filter: 'theBestOne'}))[0].url).to.equal('http://db2');
            expect((await srv.getDBs({filter: 'theBestOnes'})).length).to.equal(1);
            expect((await srv.getDBs({filter: 'theBestOnes'}))[0].url).to.equal('http://db2');
        });

        it('should verifyConnectionStates', async () => {
            const srv = new Connection(_sdk, _storage, _log);

            // Mock axios.get for successful responses
            const successResponse = {
                status: 200,
                data: JSON.stringify({_id: 'myuserId', isOk: true}),
            };

            // Mock getApiEndpoints and getDBs
            spy.on(srv, 'getApiEndpoints', (returns) =>
                Promise.resolve([
                    {key: '1', url: 'http://mock/api1', blocked: false},
                    {
                        key: '2',
                        url: 'http://mock/api2',
                        blocked: false,
                    },
                ])
            );
            spy.on(srv, 'getDBs', (returns) =>
                Promise.resolve([{key: '1', url: 'http://mock/db1', blocked: false}])
            );

            // Mock axios.get to return success for all URLs in the first call
            spy.on(axios, 'get', (url) => {
                return Promise.resolve(successResponse);
            });

            // First verification
            await srv.verifyConnectionStates();

            expect(srv.getApiEndpoints).to.have.been.called.exactly(1);
            expect(srv.getDBs).to.have.been.called.exactly(1);
            expect(axios.get).to.have.been.called.with('http://mock/api1/status?isOk=mock.sdk');
            expect(axios.get).to.have.been.called.with('http://mock/api2/status?isOk=mock.sdk');
            expect(axios.get).to.have.been.called.with('http://mock/db1');

            expect(Object.keys((srv as any).states).length).to.equal(3);
            expect((srv as any).states['http://mock/api1']).to.exist;
            expect((srv as any).states['http://mock/api1'].state).to.be.true;
            expect((srv as any).states['http://mock/api2'].state).to.be.true;
            expect((srv as any).states['http://mock/db1'].state).to.be.true;

            // Reset the spy and set up for the second call with some failures
            spy.restore(axios, 'get');
            spy.on(axios, 'get', (url) => {
                if (url.includes('api1') || url.includes('db1')) {
                    return Promise.reject({status: 500});
                }
                return Promise.resolve(successResponse);
            });

            // Second verification
            await srv.verifyConnectionStates();

            expect(srv.getApiEndpoints).to.have.been.called.exactly(2);
            expect(srv.getDBs).to.have.been.called.exactly(2);

            expect(Object.keys((srv as any).states).length).to.equal(3);
            expect((srv as any).states['http://mock/api1'].state).to.be.false;
            expect((srv as any).states['http://mock/api2'].state).to.be.true;
            expect((srv as any).states['http://mock/db1'].state).to.be.false;
        });

        it('should refreshConnection : verify tokens', async () => {
            const srv = new Connection(_sdk, _storage, _log);
            const expiredToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
                '.eyJzdWIiOiI1OWU2NTFiZTkzMWEwMDUwYzFjMTQ2ZWEiLCJhdWQiOiI1OWU2NTFiZTkzMWEwMDUwYzFjMT' +
                'Q2ZWIiLCJleHAiOjE1MDgyNzM2MzAsImRicyI6WyJodHRwOi8vZGIxIiwiaHR0cDovL2RiMiJdLCJlbmRwb2' +
                'ludHMiOlt7Il9pZCI6IjU5ZTY1MWJlOTMxYTAwNTBjMWMxNDZlZSIsInVyaSI6Imh0dHA6Ly9hcGkxIiwia2' +
                'V5IjoibWlhcHAuYXBpIn0seyJfaWQiOiI1OWU2NTFiZTkzMWEwMDUwYzFjMTQ2ZWQiLCJ1cmkiOiJodHRwOi8' +
                'vYXBpMiIsImtleSI6Im1pYXBwLmFwaSJ9LHsiX2lkIjoiNTllNjUxYmU5MzFhMDA1MGMxYzE0NmVjIiwidXJp' +
                'IjoiaHR0cDovL2FwaTMiLCJrZXkiOiJtaWFwcC5hcGkifV0sImp0aSI6IjU5ZTY1MWJlOTMxYTAwNTBjMWMx' +
                'NDZlZiIsImlhdCI6MTUwODI2NjQzMH0' +
                '.KA59NcTA-jJR_hvuJzAMcw9XpPQivDXDZVsy7oSp5_0';

            // expired token
            (srv as any).accessToken = expiredToken;
            (srv as any).idToken = expiredToken;
            (srv as any).refreshToken = expiredToken;
            (srv as any).client = {
                reAuthenticate: () => {},
            };

            // Mock client.reAuthenticate
            spy.on((srv as any).client, 'reAuthenticate', (returns) =>
                Promise.resolve(new ClientToken('not408', 'refresh_token', 'token'))
            );

            // Mock other methods
            spy.on(srv, 'setConnection', (returns) => Promise.resolve());
            spy.on(srv, 'getUser', (returns) => new ClientUser('id', 'getUser', []));
            spy.on((srv as any)._storage, 'remove', (returns) => ({}));
            spy.on((srv as any)._storage, 'set', (returns) => ({}));

            const tokens = await srv.refreshConnection();
            const user = srv.getUser();

            expect(user.id).to.equal('id');
            expect((srv as any).client.reAuthenticate).to.have.been.called.exactly(1);
            expect(srv.setConnection).to.have.been.called.exactly(1);
            expect(srv.getUser).to.have.been.called.exactly(1);
            expect((srv as any).accessToken).to.be.null;
            expect((srv as any).idToken).to.be.null;
            expect((srv as any)._storage.remove).to.have.been.called.exactly(3);
            expect((srv as any)._storage.remove).to.have.been.called.with('v2.accessToken');
            expect((srv as any)._storage.remove).to.have.been.called.with('v2.idToken');
            expect((srv as any)._storage.remove).to.have.been.called.with('v2.refreshToken');
            expect((srv as any).accessTokenPrevious).to.equal(expiredToken);
            expect((srv as any)._storage.set).to.have.been.called.exactly(2);
            expect((srv as any)._storage.set).to.have.been.called.with(
                'v2.accessTokenPrevious',
                expiredToken
            );
        });

        it('should encrypt & decrypt', () => {
            const srv = new Connection(_sdk, _storage, _log);
            srv.fidjCrypto = false;
            srv.setCryptoSalt('salt');
            const dataAsString = 'testA';
            const dataAsObject = {test: true, testB: []};

            let result: any = srv.encrypt(dataAsString);
            expect(result).to.equal('{"string":"testA"}');

            result = srv.encrypt(dataAsObject);
            expect(result).to.equal(JSON.stringify(dataAsObject));

            srv.fidjCrypto = true;
            result = srv.encrypt(dataAsString);
            expect(result).to.not.equal(dataAsString);
            expect(result).to.equal('EhMYER4IH1kfDhgHBgwXVgAVHh0dBk5OURUJBwcgTgk=');
            result = srv.decrypt(result);
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsString));

            result = srv.encrypt(dataAsObject);
            expect(result).to.not.equal(dataAsObject);
            expect(result).to.equal('EhMYER4IH1kfDhgHBgwXVgcEHwBRWxgGBgRAVgcEHwAxQ1YvLhw=');
            result = srv.decrypt(result);
            expect(result.test).to.be.true;
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsObject));

            // new salt but same encoded str
            srv.setCryptoSalt('saltNext');
            result = srv.encrypt(dataAsString);
            expect(result).to.not.equal(dataAsString);
            expect(result).to.equal('EhMYER4IH1kfDhgHBgwXVgAVHh0dBk5OURUJBwcgTgk=');
            result = srv.decrypt(result);
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsString));

            result = srv.encrypt(dataAsObject);
            expect(result).to.not.equal(dataAsObject);
            expect(result).to.equal('EhMYER4IH1kfDhgHBgwXVgcEHwBRWxgGBgRAVgcEHwAxQ1YvLhw=');
            result = srv.decrypt(result);
            expect(result.test).to.be.true;
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsObject));

            // becomes regular salt : new encoded str
            srv.setCryptoSaltAsVerified();

            result = srv.encrypt(dataAsString);
            expect(result).to.not.equal(dataAsString);
            expect(result).to.equal('EhMYESMMC1kfDhgHOwgDVgAVHh0gAlpOURUJBzokWgk=');
            result = srv.decrypt(result);
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsString));

            result = srv.encrypt(dataAsObject);
            expect(result).to.not.equal(dataAsObject);
            expect(result).to.equal('EhMYESMMC1kfDhgHOwgDVgcEHwBsXwwGBgRAVjoACwAxQ1YvExg=');
            result = srv.decrypt(result);
            expect(result.test).to.be.true;
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsObject));

            // without setCryptoSaltAsVerified, even new salt stay decrypt as old
            srv.setCryptoSalt('salt');
            result = srv.decrypt('EhMYESMMC1kfDhgHOwgDVgAVHh0gAlpOURUJBzokWgk=');
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsString));
            result = srv.decrypt('EhMYESMMC1kfDhgHOwgDVgcEHwBsXwwGBgRAVjoACwAxQ1YvExg=');
            expect(result.test).to.be.true;
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsObject));
            result = srv.decrypt('EhMYER4IH1kfDhgHBgwXVgAVHh0dBk5OURUJBwcgTgk=');
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsString));
            result = srv.decrypt('EhMYER4IH1kfDhgHBgwXVgcEHwBRWxgGBgRAVgcEHwAxQ1YvLhw=');
            expect(result.test).to.be.true;
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsObject));
            // again...
            result = srv.decrypt('EhMYESMMC1kfDhgHOwgDVgAVHh0gAlpOURUJBzokWgk=');
            expect(JSON.stringify(result)).to.equal(JSON.stringify(dataAsString));
        });
    });
});
