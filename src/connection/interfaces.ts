export interface ConnectionFindOptionsInterface {
    filter: string,
}

export class ClientToken {
    constructor(
        public id: string,
        public type: string,
        public data: string) {
    }
}

export class ClientTokens {
    constructor(
        public username: string,
        public accessToken: ClientToken,
        public idToken: ClientToken,
        public refreshToken: ClientToken) {
    }
}

export class ClientUser {
    constructor(public id: string,
                public username: string,
                public roles: string[],
                message: string) {
    }
}

