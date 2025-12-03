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
 */
export interface ModuleServiceInitOptionsInterface {
    prod: boolean;
    useDB?: boolean;
    crypto?: boolean;
    logLevel?: LoggerLevelEnum;
}

export interface ModuleServiceLoginOptionsInterface {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
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
