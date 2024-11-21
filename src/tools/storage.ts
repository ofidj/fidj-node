const isNodeContext = () => (typeof window === 'undefined');

interface IStorage {
    getItem(key: string): any;

    setItem(key: string, value: any): void;

    removeItem(key: string): void;
}

class SimpleMemoryStorage implements IStorage {
    constructor(private mem: any = {}) {
    }

    setItem(key: string, value: any) {
        this.mem[key] = value;
    }

    getItem(key: string) {
        return this.mem[key];
    }

    removeItem(key: string): void {
        delete this.mem[key];
    }
}

/**
 * localStorage class factory
 * Usage : var LocalStorage = fidj.LocalStorageFactory(window.localStorage); // to create a new class
 * Usage : var localStorageService = new LocalStorage(); // to create a new instance
 */
export class LocalStorage {

    public version = '0.1';
    private readonly storage: IStorage;

    constructor(private storageKey: string) {
        if (isNodeContext()) {
            this.storage = new SimpleMemoryStorage();
        } else {
            this.storage = localStorage;
        }
    }

    /**
     * Sets a key's value.
     *
     * @param key - Key to set. If this value is not set or not
     *              a string an exception is raised.
     * @param value - Value to set. This can be any value that is JSON
     *              compatible (Numbers, Strings, Objects etc.).
     * @returns the stored value which is a container of user value.
     */
    set(key: string, value) {

        key = this.storageKey + key;
        this.checkKey(key);
        // clone the object before saving to storage
        const t = typeof (value);
        if (t === 'undefined') {
            value = 'null';
        } else if (value === null) {
            value = 'null';
        } else if (t === 'string') {
            value = JSON.stringify({string: value})
        } else if (t === 'number') {
            value = JSON.stringify({number: value});
        } else if (t === 'boolean') {
            value = JSON.stringify({bool: value});
        } else if (t === 'object') {
            value = JSON.stringify({json: value});
        } else {
            // reject and do not insert
            // if (typeof value == "function") for example
            throw new TypeError('Value type ' + t + ' is invalid. It must be null, undefined, xml, string, number, boolean or object');
        }
        this.storage.setItem(key, value);
        return value;
    };

    /**
     * Looks up a key in cache
     *
     * @param key - Key to look up.
     * @param def - Default value to return, if key didn't exist.
     * @returns the key value, default value or <null>
     */
    get(key: string, def?) {
        key = this.storageKey + key;
        this.checkKey(key);
        try {
            const item = this.storage.getItem(key);
            if (item !== null) {
                if (item === 'null') {
                    return null;
                }
                const value = JSON.parse(item);

                if ('string' in value) {
                    return value.string;
                } else if ('number' in value) {
                    return value.number.valueOf();
                } else if ('bool' in value) {
                    return value.bool.valueOf();
                } else {
                    return value.json;
                }
            }
        } catch (e) {
        }
        return !def ? null : def;
    };

    /**
     * Deletes a key from cache.
     *
     * @param  key - Key to delete.
     * @returns true if key existed or false if it didn't
     */
    remove(key: string) {
        key = this.storageKey + key;
        this.checkKey(key);
        const existed = (this.storage.getItem(key) !== null);
        this.storage.removeItem(key);
        return existed;
    };

    private checkKey(key) {
        if (!key || (typeof key !== 'string')) {
            throw new TypeError('Key type must be string');
        }
        return true;
    }
}
