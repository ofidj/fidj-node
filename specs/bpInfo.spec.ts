import {expect} from 'chai';
import {bpInfo} from '../src/bpInfo';

// The SDK announces this version to every app it runs in, and a generated app
// prints it as `fidj@<version>`. It is a compiled constant, so nothing else
// notices when a hand-edited package.json leaves it behind.
describe('Reported version', () => {
    it('is the version this package publishes', () => {
        const {version} = require('../package.json');
        expect(bpInfo.version).equal(
            'v' + version,
            'run npm run version:sync after changing the version'
        );
    });
});
