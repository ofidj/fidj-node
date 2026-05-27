export interface ErrorInterface {
    code: number;
    reason: string;
}

export interface EndpointInterface {
    key: string;
    url: string;
    blocked: boolean;
}

export interface EndpointFilterInterface {
    key?: string;
    showBlocked?: boolean;
}

export interface EndpointCallInterface<TData = any> {
    verb: string;
    key?: string;
    relativePath?: string;
    data?: TData;

    // in case of key not found
    defaultKeyUrl?: string;

    timeout?: number;
}

/**
 * prod : true by default
 * useDB : false by default
 * crypto : false by default
 * logLevel : NONE by default
 * apiEndpoint : overrides the auto-detected API URL (useful for local dev against fidj-api sandbox)
 */
export interface ModuleServiceInitOptionsInterface {
    prod?: boolean;
    useDB?: boolean;
    crypto?: boolean;
    logLevel?: LoggerLevelEnum;
    apiEndpoint?: string;
}

export interface ModuleServiceLoginOptionsInterface {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
}

/**
 * Options for the standard email+password login() call.
 * autoSignup: when true (default), an unknown email auto-creates an account (Fidj's optimistic
 * auth — Zero-Friction signup, epic FIDJ-5/FIDJ-12). Pass false to force strict login: fidj-api
 * returns 401 if the email is unknown.
 */
export interface ModuleServiceLoginCallOptionsInterface {
    autoSignup?: boolean;
}

export interface SdkInterface {
    org: string;
    version: string;
    prod: boolean;
    useDB: boolean;
}

export enum LoggerLevelEnum {
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4,
}

export interface LoggerInterface {
    setLevel: (LoggerLevelEnum) => void;

    log: (a?, b?, c?, d?, e?, f?) => any;
    warn: (a?, b?, c?, d?, e?, f?) => any;
    error: (a?, b?, c?, d?, e?, f?) => any;
}
