import {ErrorInterface} from './Interfaces';

export class FidjError implements ErrorInterface {
    constructor(
        public code: number,
        public reason: string,
        // What the API actually answered, when it answered something. A refusal
        // that names the agreement it wants is only useful if the agreement
        // survives the trip to the caller.
        public details?: unknown
    ) {}

    equals(err: FidjError) {
        return this.code === err.code && this.reason === err.reason;
    }

    toString(): string {
        const msg: string =
            typeof this.reason === 'string' ? this.reason : JSON.stringify(this.reason);
        return '' + this.code + ' - ' + msg;
    }
}
