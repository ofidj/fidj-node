import {expect} from 'chai';
import {LocalStorage, Xor} from '../../src';

describe('Tools', () => {
    const _key = 'azerty';

    it('should encrypt & decrypt', function () {
        const msg = 'test é message ?';
        const msg_encrypted = Xor.encrypt(msg, _key);
        expect(msg_encrypted).equal('AAgRFxkQElcJHQAKFBcRFwcNQcKTRR8RChIbAhdURg==');
        const msg_decrypted = Xor.decrypt(msg_encrypted, _key);
        expect(msg_decrypted).equal(msg);

        const oldMsg =
            'ShJYFgtfEV8IE15TCAETCUc1UFlGAERWXwwAQlVARRVEUgsXEVMVABdFEwMSWEQQSUZ' +
            'YUAodEwoQDAtfHgwcQh1RDBZSXwBeXkVGCQ1fVkdfE1RXFgdDWhUHWF9cR14TfwoBVF0SDBRCRghTV' +
            'V9eChYRQAwHEVFfABAfHUtRHRJEBAhEVkdJBxwQABdFWggSRVUQX1wdEQYcXV9AR14TQwoAWERbEwETThg=';
        const oldKey = '102ed13es';
        const odDecrypted = Xor.decrypt(oldMsg, oldKey, true);
        expect(odDecrypted).equal(
            '{"json":{"name":"Faite glisser quand c\'est fait",' +
                '"icon":"ion-ios-circle-outline",' +
                '"description":"Lorem ipsum dolor sit amet...",' +
                '"value":6,"estimate":8,"color":"positive"}}'
        );
    });

    it('should set a string item', () => {
        const fs = new LocalStorage('test');
        let v = fs.set('a', 'v');
        expect(v).eq('{"string":"v"}');

        v = fs.get('a', 'default');
        expect(v).eq('v');

        v = fs.remove('a');
        expect(v).eq(true);

        v = fs.remove('a');
        expect(v).eq(false);
    });

    it('should set a number item', () => {
        const fs = new LocalStorage('test');

        let v = fs.set('a', 15);
        expect(v).eq('{"number":15}');

        v = fs.get('a', 'default');
        expect(v).eq(15);
    });

    it('should set a boolean item', () => {
        const fs = new LocalStorage('test');
        let v = fs.set('a', true);
        expect(v).eq('{"bool":true}');
        v = fs.get('a', 'default');
        expect(v).eq(true);
    });

    it('should set an object item', () => {
        const fs = new LocalStorage('test');

        let v = fs.set('a', {a: 1, b: 's'});

        expect(v).eq('{"json":{"a":1,"b":"s"}}');
        v = fs.get('a', 'default');
        expect(v.a).eq(1);
        expect(v.b).eq('s');
    });
});
