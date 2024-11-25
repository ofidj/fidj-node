import {expect} from 'chai';
import {FidjNodeService} from '../../src';

describe('AppCreation in Sandbox', () => {

    it('should login and create app if not already exists', async function () {

        this.timeout(10000);
        const fidjNodeService = new FidjNodeService();
        await fidjNodeService.fidjInit('fidj-sandbox-0123fe7ed0000001', {prod: false});
        const clientUser = await fidjNodeService.fidjLogin('test', 'test');
        expect(clientUser.username).equal('test');
        expect(clientUser.roles.length).equal(1);
        expect(clientUser.roles[0]).equal('Free');

        const app = {title: 'test'};
        let createdApp = {app};
        try {
            // create
            createdApp = (await fidjNodeService.fidjSendOnEndpoint({
                verb: 'POST',
                key: 'apps',
                data: app,
            })).data;
        } catch (e) {
            // or already created
            expect(e.code).equal(400);
            expect(JSON.stringify(e.message)).equal('{"status":"looks you are duplicating one application"}');
        }
        expect(createdApp.app.title).equal('test');

    });

});
