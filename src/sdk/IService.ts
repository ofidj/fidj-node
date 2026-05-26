import {
    EndpointCallInterface,
    ModuleServiceInitOptionsInterface,
    ModuleServiceLoginOptionsInterface,
} from './Interfaces';
import {ClientUser} from '../connection';
import {
    FidjApiConsentsResponse,
    FidjApiConsentsUpdateRequest,
    FidjApiConsentsHistoryResponse,
    FidjApiUsersMeResponse,
    FidjApiUsersMeDetailsResponse,
    FidjApiUsersMeUpdateRequest,
} from '../api';

export interface IService {
    init(fidjId?: string, options?: ModuleServiceInitOptionsInterface): Promise<void>;

    login(login: string, password: string): Promise<ClientUser>;

    loginInDemoMode(options?: ModuleServiceLoginOptionsInterface): Promise<ClientUser>;

    // Convenience: init + login in one call
    initAndLogin(
        login: string,
        password: string,
        fidjId?: string,
        options?: ModuleServiceInitOptionsInterface
    ): Promise<ClientUser>;

    // Convenience: init in demo/sandbox mode
    initDemo(fidjId?: string, options?: ModuleServiceInitOptionsInterface): Promise<ClientUser>;

    sendOnEndpoint<TData = any, TResponse = any>(
        input: EndpointCallInterface<TData>
    ): Promise<{status: number; data?: TResponse}>;

    // Typed API convenience methods
    getMe(): Promise<{status: number; data?: FidjApiUsersMeResponse}>;
    getMeDetails(): Promise<{status: number; data?: FidjApiUsersMeDetailsResponse}>;
    updateMe(
        data: FidjApiUsersMeUpdateRequest
    ): Promise<{status: number; data?: FidjApiUsersMeResponse}>;
    getConsents(): Promise<{status: number; data?: FidjApiConsentsResponse}>;
    putConsents(
        data: FidjApiConsentsUpdateRequest
    ): Promise<{status: number; data?: FidjApiConsentsResponse}>;
    getConsentsHistory(): Promise<{status: number; data?: FidjApiConsentsHistoryResponse}>;
}
