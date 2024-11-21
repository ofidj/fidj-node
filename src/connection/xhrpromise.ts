export class XHRPromise {

    public DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded; charset=UTF-8';
    private _xhr;
    private _unloadHandler: any;

    constructor() {
    };

    /*
     * XHRPromise.send(options) -> Promise
     * - options (Object): URL, method, data, etc.
     *
     * Create the XHR object and wire up event handlers to use a promise.
     */
    send(options): Promise<any> {
        let defaults;
        if (options == null) {
            options = {};
        }
        defaults = {
            method: 'GET',
            data: null,
            headers: {},
            async: true,
            username: null,
            password: null,
            withCredentials: false
        };
        options = Object.assign({}, defaults, options);
        return new Promise(((_this: XHRPromise) => {
            return (resolve, reject) => {
                let e, header, ref, value, xhr;
                if (!XMLHttpRequest) {
                    _this._handleError('browser', reject, null, 'browser doesn\'t support XMLHttpRequest');
                    return;
                }
                if (typeof options.url !== 'string' || options.url.length === 0) {
                    _this._handleError('url', reject, null, 'URL is a required parameter');
                    return;
                }
                _this._xhr = xhr = new XMLHttpRequest;
                xhr.onload = () => {
                    let responseText;
                    _this._detachWindowUnload();
                    try {
                        responseText = _this._getResponseText();
                    } catch (_error) {
                        _this._handleError('parse', reject, null, 'invalid JSON response');
                        return;
                    }
                    return resolve({
                        url: _this._getResponseUrl(),
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: responseText,
                        headers: _this._getHeaders(),
                        xhr: xhr
                    });
                };
                xhr.onerror = () => {
                    return _this._handleError('error', reject);
                };
                xhr.ontimeout = () => {
                    return _this._handleError('timeout', reject);
                };
                xhr.onabort = () => {
                    return _this._handleError('abort', reject);
                };
                _this._attachWindowUnload();
                xhr.open(options.method, options.url, options.async, options.username, options.password);
                if (options.withCredentials) {
                    xhr.withCredentials = true;
                }
                if ((options.data != null) && !options.headers['Content-Type']) {
                    options.headers['Content-Type'] = _this.DEFAULT_CONTENT_TYPE;
                }
                ref = options.headers;
                for (header in ref) {
                    if (ref.hasOwnProperty(header)) {
                        value = ref[header];
                        xhr.setRequestHeader(header, value);
                    }
                }
                try {
                    return xhr.send(options.data);
                } catch (_error) {
                    e = _error;
                    return _this._handleError('send', reject, null, e.toString());
                }
            };
        })(this));
    };

    /*
     * XHRPromise.getXHR() -> XMLHttpRequest
     */
    getXHR() {
        return this._xhr;
    };

    /*
     * XHRPromise._attachWindowUnload()
     *
     * Fix for IE 9 and IE 10
     * Internet Explorer freezes when you close a webpage during an XHR request
     * https://support.microsoft.com/kb/2856746
     *
     */
    private _attachWindowUnload() {
        this._unloadHandler = this._handleWindowUnload.bind(this);
        if ((window as any).attachEvent) {
            return (window as any).attachEvent('onunload', this._unloadHandler);
        }
    };

    /*
     * XHRPromise._detachWindowUnload()
     */
    private _detachWindowUnload() {
        if ((window as any).detachEvent) {
            return (window as any).detachEvent('onunload', this._unloadHandler);
        }
    };

    /*
     * XHRPromise._getHeaders() -> Object
     */
    private _getHeaders() {
        return this._parseHeaders(this._xhr.getAllResponseHeaders());
    };

    /*
     * XHRPromise._getResponseText() -> Mixed
     *
     * Parses response text JSON if present.
     */
    private _getResponseText() {
        let responseText;
        responseText = typeof this._xhr.responseText === 'string' ? this._xhr.responseText : '';
        switch ((this._xhr.getResponseHeader('Content-Type') || '').split(';')[0]) {
            case 'application/json':
            case 'text/javascript':
                responseText = JSON.parse(responseText + '');
        }
        return responseText;
    };

    /*
     * XHRPromise._getResponseUrl() -> String
     *
     * Actual response URL after following redirects.
     */
    private _getResponseUrl() {
        if (this._xhr.responseURL != null) {
            return this._xhr.responseURL;
        }
        if (/^X-Request-URL:/m.test(this._xhr.getAllResponseHeaders())) {
            return this._xhr.getResponseHeader('X-Request-URL');
        }
        return '';
    };

    /*
     * XHRPromise._handleError(reason, reject, status, statusText)
     * - reason (String)
     * - reject (Function)
     * - status (String)
     * - statusText (String)
     */
    private _handleError(reason, reject, status?, statusText?) {
        this._detachWindowUnload();

        // _this._handleError('browser', reject, null, 'browser doesn\'t support XMLHttpRequest');
        // _this._handleError('url', reject, null, 'URL is a required parameter');
        // _this._handleError('parse', reject, null, 'invalid JSON response');
        // return _this._handleError('error', reject);
        // return _this._handleError('timeout', reject);
        // return _this._handleError('abort', reject);
        // return _this._handleError('send', reject, null, e.toString());
        // console.log('_handleError:', reason, this._xhr.status);
        let code = 404;
        if (reason === 'timeout') {
            code = 408;
        } else if (reason === 'abort') {
            code = 408;
        }

        return reject({
            reason: reason,
            status: status || this._xhr.status || code,
            code: status || this._xhr.status || code,
            statusText: statusText || this._xhr.statusText,
            xhr: this._xhr
        });
    };

    /*
     * XHRPromise._handleWindowUnload()
     */
    private _handleWindowUnload() {
        return this._xhr.abort();
    };

    private trim(str) {
        return str.replace(/^\s*|\s*$/g, '');
    }

    private isArray(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    }

    private forEach(list, iterator) {
        if (toString.call(list) === '[object Array]') {
            this.forEachArray(list, iterator, this)
        } else if (typeof list === 'string') {
            this.forEachString(list, iterator, this)
        } else {
            this.forEachObject(list, iterator, this)
        }
    }

    private forEachArray(array, iterator, context) {
        for (let i = 0, len = array.length; i < len; i++) {
            if (array.hasOwnProperty(i)) {
                iterator.call(context, array[i], i, array)
            }
        }
    }

    private forEachString(string, iterator, context) {
        for (let i = 0, len = string.length; i < len; i++) {
            // no such thing as a sparse string.
            iterator.call(context, string.charAt(i), i, string)
        }
    }

    private forEachObject(object, iterator, context) {
        for (const k in object) {
            if (object.hasOwnProperty(k)) {
                iterator.call(context, object[k], k, object)
            }
        }
    }

    private _parseHeaders(headers) {
        if (!headers) {
            return {};
        }

        const result = {};

        this.forEach(
            this.trim(headers).split('\n')
            , (row) => {
                const index = row.indexOf(':')
                    , key = this.trim(row.slice(0, index)).toLowerCase()
                    , value = this.trim(row.slice(index + 1));

                if (typeof (result[key]) === 'undefined') {
                    result[key] = value
                } else if (this.isArray(result[key])) {
                    result[key].push(value)
                } else {
                    result[key] = [result[key], value]
                }
            }
        );

        return result;
    }


}
