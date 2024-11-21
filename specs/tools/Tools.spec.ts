import {expect} from 'chai';
import {Xor} from '../../src';

describe('Tools', () => {

    const _key = 'azerty';

    before(() => {
    });
    it('should todo', async () => {
        expect(true).equal(true);
    });

    it('should encrypt & decrypt', function () {

        const msg = 'test é message ?';
        const msg_encrypted = Xor.encrypt(msg, _key);
        expect(msg_encrypted).equal('AAgRFxkQElcJHQAKFBcRFwcNQcKTRR8RChIbAhdURg==');
        const msg_decrypted = Xor.decrypt(msg_encrypted, _key);
        expect(msg_decrypted).equal(msg);

        const oldMsg = 'ShJYFgtfEV8IE15TCAETCUc1UFlGAERWXwwAQlVARRVEUgsXEVMVABdFEwMSWEQQSUZ' +
            'YUAodEwoQDAtfHgwcQh1RDBZSXwBeXkVGCQ1fVkdfE1RXFgdDWhUHWF9cR14TfwoBVF0SDBRCRghTV' +
            'V9eChYRQAwHEVFfABAfHUtRHRJEBAhEVkdJBxwQABdFWggSRVUQX1wdEQYcXV9AR14TQwoAWERbEwETThg=';
        const oldKey = '102ed13es';
        const odDecrypted = Xor.decrypt(oldMsg, oldKey, true);
        expect(odDecrypted).equal('{"json":{"name":"Faite glisser quand c\'est fait",' +
            '"icon":"ion-ios-circle-outline",' +
            '"description":"Lorem ipsum dolor sit amet...",' +
            '"value":6,"estimate":8,"color":"positive"}}');

    });

});
