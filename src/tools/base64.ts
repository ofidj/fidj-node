const base64 = require('base-64');

export class Base64 {

    constructor() {
    };

    /**
     * Decodes string from Base64 string
     */
    public static encode(input: string): string {

        if (!input) {
            return null;
        }

        // const _btoa = typeof window !== 'undefined' ? window.btoa : (a) => a;

        let result = ''
        try {
            result = encodeURIComponent(input);
            result = result.replace(/%([0-9A-F]{2})/g,
                (match, p1) => String.fromCharCode(parseInt('0x' + p1, 16)))
            result = base64.encode(result);
        } catch (e) {
            console.error(e);
        }
        return result;
    }

    public static decode(input: string): string {

        if (!input) {
            return null;
        }

        // TODO const _atob = typeof window !== 'undefined' ? window.atob : import 'atob';
        // const _atob = window.atob;
        let result = ''
        try {
            result = base64.decode(input);
            const results = result.split('');
            result = results.map((c) => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('');
            result = decodeURIComponent(result);
        } catch (e) {
            console.error(e);
        }
        return result;
    }
}
