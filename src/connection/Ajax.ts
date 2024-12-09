import axios from 'axios';
import {ErrorInterface} from '../sdk';

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
    UNKNOWN = 'UNKNOWN',
    TIMEOUT = 'TIMEOUT',
    STATUS = 'STATUS'
}

export interface XhrErrorInterface extends ErrorInterface {
    code: number,
    reason: XhrErrorReason,
    status: number,
    message: string,
    data?: any,
}

export class Ajax {

    constructor() {
    }

    private static formatResponseData(response: any): { status: number, data?: any } {

        if (response?.status && (parseInt(response.status, 10) < 200 || parseInt(response.status, 10) >= 300)) {
            throw Ajax.formatError(response);
        }

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

        return errorFormatted;
    };


    /**
     * @throws XhrErrorInterface
     * @param args
     */
    public async post(args: XhrOptionsInterface): Promise<{ status: number, data?: any }> {

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

        let res: any;
        try {
            res = await axios.post(opt.url, opt.data, options);
        } catch (err) {
            throw Ajax.formatError(err);
        }

        return Ajax.formatResponseData(res);

    }

    /**
     * @throws XhrErrorInterface
     * @param args
     */
    public async put(args: XhrOptionsInterface): Promise<{ status: number, data?: any }> {
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

        let res: any;
        try {
            res = await axios.put(opt.url, opt.data, options);
        } catch (err) {
            throw Ajax.formatError(err);
        }
        return Ajax.formatResponseData(res);
    }

    /**
     * @throws XhrErrorInterface
     * @param args
     */
    public async delete(args: XhrOptionsInterface): Promise<{ status: number, data?: any }> {
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

        let res: any;
        try {
            res = await axios.delete(opt.url, options);
        } catch (err) {
            throw Ajax.formatError(err);
        }
        return Ajax.formatResponseData(res);
    }

    /**
     * @throws XhrErrorInterface
     * @param args
     */
    public async get(args: XhrOptionsInterface): Promise<{ status: number, data?: any }> {
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

        let res: any;
        try {
            res = await axios.get(opt.url, options);
        } catch (err) {
            throw Ajax.formatError(err);
        }
        return Ajax.formatResponseData(res);
    }
}