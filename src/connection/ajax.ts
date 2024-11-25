import axios from 'axios';

export interface XhrOptionsInterface {
    url: string,
    data?: any,
    headers?: any,
    async?: boolean,
    username?: string,
    password?: string,
    withCredentials?: boolean,
    timeout?: number,
}

export enum XhrErrorReason {
    UNKNOWN,
    TIMEOUT,
    STATUS
}


export interface XhrErrorInterface {
    reason: XhrErrorReason,
    status: number,
    code: number,
    message: string,
}

export class Ajax {

    // private static xhr: XHRPromise = new XHRPromise();
    private xhr; // : XHRPromise;

    constructor() {
        this.xhr = axios;
    };

    private static formatResponseData(response: any): any {
        const status = response?.status ? response.status : 200;
        let data = response;
        while (data && typeof data.data !== 'undefined') {
            data = data.data;
        }

        try {
            data = JSON.parse(response.data);
        } catch (e) {
        }

        return {status, data};
    };

    private static formatError(error: any): XhrErrorInterface {

        const errorFormatted: XhrErrorInterface = {
            reason: XhrErrorReason.UNKNOWN,
            status: -1,
            code: -1,
            message: '',
        };

        if (error.status) {
            errorFormatted.reason = XhrErrorReason.STATUS;
            errorFormatted.status = parseInt(error.status, 10);
            errorFormatted.code = parseInt(error.status, 10);
        }

        if (error.response) {
            if (error.response.data) {
                errorFormatted.message = error.response.data;
            } else {
                errorFormatted.message = error.response;
            }

            if (error.response.status) {
                errorFormatted.reason = XhrErrorReason.STATUS;
                errorFormatted.status = parseInt(error.response.status, 10);
                errorFormatted.code = parseInt(error.response.status, 10);
            } else if (error.response.status === null) { // timeout
                errorFormatted.reason = XhrErrorReason.TIMEOUT;
                errorFormatted.status = 408;
                errorFormatted.code = 408;
            }

        } else if (error.request) {
            errorFormatted.message = error.request;
        } else if (error.message) {
            errorFormatted.message = error.message;
        }

        // _this._handleError('browser', reject, null, 'browser doesn\'t support XMLHttpRequest');
        // _this._handleError('url', reject, null, 'URL is a required parameter');
        // _this._handleError('parse', reject, null, 'invalid JSON response');
        // return _this._handleError('error', reject);
        // return _this._handleError('timeout', reject);
        // return _this._handleError('abort', reject);
        // return _this._handleError('send', reject, null, e.toString());

        // if (err.reason === 'timeout') {
        //     err.code = 408;
        // } else {
        //     err.code = 404;
        // }

        return errorFormatted;
    };

    public async post(args: XhrOptionsInterface): Promise<any | XhrErrorInterface> {

        const opt: any = {
            method: 'POST',
            url: args.url,
            data: JSON.stringify(args.data)
        };
        if (args.headers) {
            opt.headers = args.headers;
        }

        const options = {headers: opt.headers};
        if (args.timeout) {
            options['timeout'] = args.timeout;
        }

        return this.xhr.post(opt.url, opt.data, options)
            .then(res => {
                if (res.status &&
                    (parseInt(res.status, 10) < 200 || parseInt(res.status, 10) >= 300)) {
                    return Promise.reject(Ajax.formatError(res));
                }

                return Promise.resolve(Ajax.formatResponseData(res));
            })
            .catch(err => {
                return Promise.reject(Ajax.formatError(err));
            });
    }

    public async put(args: XhrOptionsInterface): Promise<any | XhrErrorInterface> {
        const opt: any = {
            method: 'PUT',
            url: args.url,
            data: JSON.stringify(args.data)
        };
        if (args.headers) {
            opt.headers = args.headers;
        }
        const options = {headers: opt.headers};
        if (args.timeout) {
            options['timeout'] = args.timeout;
        }

        return this.xhr
            .put(opt.url, opt.data, options)
            .then(res => {
                if (res.status &&
                    (parseInt(res.status, 10) < 200 || parseInt(res.status, 10) >= 300)) {
                    return Promise.reject(Ajax.formatError(res));
                }

                return Promise.resolve(Ajax.formatResponseData(res));
            })
            .catch(err => {
                return Promise.reject(Ajax.formatError(err));
            });
    }

    public async delete(args: XhrOptionsInterface): Promise<any | XhrErrorInterface> {
        const opt: any = {
            method: 'DELETE',
            url: args.url,
            data: JSON.stringify(args.data)
        };
        if (args.headers) {
            opt.headers = args.headers;
        }
        const options = {headers: opt.headers};
        if (args.timeout) {
            options['timeout'] = args.timeout;
        }
        return this.xhr
            .delete(opt.url, options)
            .then(res => {
                if (res.status &&
                    (parseInt(res.status, 10) < 200 || parseInt(res.status, 10) >= 300)) {
                    return Promise.reject(Ajax.formatError(res));
                }

                return Promise.resolve(Ajax.formatResponseData(res));
            })
            .catch(err => {
                return Promise.reject(Ajax.formatError(err));
            });
    }

    public async get(args: XhrOptionsInterface): Promise<any | XhrErrorInterface> {
        const opt: any = {
            method: 'GET',
            url: args.url
        };
        if (args.data) {
            opt.data = args.data;
        }
        if (args.headers) {
            opt.headers = args.headers;
        }
        const options = {headers: opt.headers};
        if (args.timeout) {
            options['timeout'] = args.timeout;
        }
        return this.xhr
            .get(opt.url, options)
            .then(res => {
                if (res.status &&
                    (parseInt(res.status, 10) < 200 || parseInt(res.status, 10) >= 300)) {
                    return Promise.reject(Ajax.formatError(res));
                }

                return Promise.resolve(Ajax.formatResponseData(res));
            })
            .catch(err => {
                return Promise.reject(Ajax.formatError(err));
            });
    }
}
