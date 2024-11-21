import * as tools from '../../src/tools';

describe('fidj.tools.Xor', function () {

    const _key = 'azerty';

    beforeEach(function () {
    });


    it('should encrypt & decrypt', function () {

        const msg = 'test é message ?';
        const msg_encrypted = tools.Xor.encrypt(msg, _key);
        expect(msg_encrypted).toBe('AAgRFxkQElcJHQAKFBcRFwcNQcKTRR8RChIbAhdURg==');
        const msg_decrypted = tools.Xor.decrypt(msg_encrypted, _key);
        expect(msg_decrypted).toBe(msg);


        const oldMsg = 'ShJYFgtfEV8IE15TCAETCUc1UFlGAERWXwwAQlVARRVEUgsXEVMVABdFEwMSWEQQSUZ' +
            'YUAodEwoQDAtfHgwcQh1RDBZSXwBeXkVGCQ1fVkdfE1RXFgdDWhUHWF9cR14TfwoBVF0SDBRCRghTV' +
            'V9eChYRQAwHEVFfABAfHUtRHRJEBAhEVkdJBxwQABdFWggSRVUQX1wdEQYcXV9AR14TQwoAWERbEwETThg=';
        const oldKey = '102ed13es';
        const odDecrypted = tools.Xor.decrypt(oldMsg, oldKey, true);
        expect(odDecrypted).toBe('{"json":{"name":"Faite glisser quand c\'est fait",' +
            '"icon":"ion-ios-circle-outline",' +
            '"description":"Lorem ipsum dolor sit amet...",' +
            '"value":6,"estimate":8,"color":"positive"}}');

    });

});
