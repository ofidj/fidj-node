import {expect} from 'chai';
import {FidjNodeService} from '../../src';

describe('AppCreation in Sandbox', () => {

    it('should login and create app if not already exists', async function () {

        this.timeout(10000);
        const testName = 'test'
        const fidjNodeService = new FidjNodeService();
        await fidjNodeService.init('fidj-sandbox-0123fe7ed0000001', {prod: false});
        const clientUser = await fidjNodeService.login(testName + '@fidj.ovh', 'test');
        expect(clientUser.username).equal(testName + '@fidj.ovh');
        expect(clientUser.roles.length).equal(1);
        expect(clientUser.roles[0]).equal('Free');

        const app = {title: testName};
        let createdApp = {app};
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
        const idToken1 = await fidjNodeService.fidjGetIdToken();
        expect(!!idToken1).eq(true);

        await fidjNodeService.sync({forceRefresh: true});

        const idToken2 = await fidjNodeService.fidjGetIdToken();
        expect(!!idToken2).eq(true);

    });

});
