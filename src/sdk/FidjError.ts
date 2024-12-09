import {ErrorInterface} from './Interfaces';

export class FidjError implements ErrorInterface {

    constructor(public code: number, public reason: string) {
    };

    equals(err: FidjError) {
        return this.code === err.code && this.reason === err.reason;
    }

    toString(): string {
        const msg: string = (typeof this.reason === 'string') ? this.reason : JSON.stringify(this.reason);
        return '' + this.code + ' - ' + msg;
    }

}
