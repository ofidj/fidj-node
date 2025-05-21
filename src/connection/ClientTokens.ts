import {ClientToken} from './ClientToken';

export class ClientTokens {
    constructor(
        public username: string,
        public accessToken: ClientToken,
        public idToken: ClientToken,
        public refreshToken: ClientToken) {
    }
}
