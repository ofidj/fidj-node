import {expect} from 'chai';
import {FidjNodeService} from '../../src';
import {promisify} from 'util';

const sleep = promisify(setTimeout);

describe('AppCreation in Sandbox', function () {

    this.timeout(1000000);

    it('should login and create app if not already exists', async function () {

        // 1) Login in FIDJ
        const testName = 'test_' + new Date().getTime();
        const fidjNodeService = new FidjNodeService();
        await fidjNodeService.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
        const clientUser = await fidjNodeService.login(testName + '@fidj.ovh', 'test');
        expect(clientUser.username).equal(testName + '@fidj.ovh');
        expect(clientUser.roles.length).equal(1);
        expect(clientUser.roles[0]).equal('Free');

        // 2) Test IdToken refreshed
        const idToken1 = await fidjNodeService.fidjGetIdToken();
        expect(!!idToken1).eq(true);
        await fidjNodeService.sync({forceRefresh: true});
        const idToken2 = await fidjNodeService.fidjGetIdToken();
        expect(!!idToken2).eq(true);

        // 3) Create an APP
        const app = {title: testName};
        let createdApp: any = {app};
        try {
            // create
            const response = await fidjNodeService.sendOnEndpoint({
                verb: 'POST',
                key: 'apps',
                data: app,
            });

            createdApp = response.data;
        } catch (e) {
            // or already created
            expect(e.code).equal(400);
            expect(JSON.stringify(e.message)).equal('{"status":"looks you are duplicating one application"}');
        }
        expect(createdApp.app.title).equal(testName);
        expect(createdApp.app.id).not.eq(undefined);

        // 4) Get APP Details
        const appId = createdApp.app.id;
        const appDetails = await fidjNodeService.sendOnEndpoint({
            verb: 'GET',
            key: 'apps',
            relativePath: `${appId}/details`,
        });

        await fidjNodeService.logout(true);

        // 5) Login on this created APP
        let appFidjService = new FidjNodeService();
        await appFidjService.init(appDetails.data.app.id, {prod: false});
        await appFidjService.login(testName + '@fidj.ovh', 'test');

        // 6) Test OwnerUser roles capabilities
        let ownerUser = appFidjService.getOwnerUser();
        expect(ownerUser.roles.length).equal(1);
        await ownerUser.addRole('admin');
        await appFidjService.logout(true);

        await sleep(3000);
        await appFidjService.init(appDetails.data.app.id, {prod: false});
        await appFidjService.login(testName + '@fidj.ovh', 'test');
        ownerUser = appFidjService.getOwnerUser();
        expect(ownerUser.roles.length).equal(2, JSON.stringify(ownerUser.roles));
        expect(ownerUser.roles[0]).equal('Owner');
        expect(ownerUser.roles[1]).equal('admin');

    });

});
