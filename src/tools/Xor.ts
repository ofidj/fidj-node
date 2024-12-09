import {Base64} from './Base64';

export class Xor {

    static header = 'artemis-lotsum';

    constructor() {
    };

    public static encrypt(value: string, key: string): string {

        let result = '';

        value = Xor.header + value;

        for (let i = 0; i < value.length; i++) {
            result += String.fromCharCode((value[i].charCodeAt(0).toString(10) as any) ^ Xor.keyCharAt(key, i));
        }
        result = Base64.encode(result);
        return result;
    };

    public static decrypt(value: string, key: string, oldStyle?: boolean): string {
        let result = '';
        value = Base64.decode(value);
        for (let i = 0; i < value.length; i++) {
            result += String.fromCharCode((value[i].charCodeAt(0).toString(10) as any) ^ Xor.keyCharAt(key, i));
        }

        if (!oldStyle && Xor.header !== result.substring(0, Xor.header.length)) {
            return null;
        }

        if (!oldStyle) {
            result = result.substring(Xor.header.length);
        }
        return result;
    }

    public static keyCharAt(key, i) {
        return key[Math.floor(i % key.length)].charCodeAt(0).toString(10);
    }


}
