import {
    EndpointCallInterface,
    ModuleServiceInitOptionsInterface,
    ModuleServiceLoginOptionsInterface,
} from './Interfaces';
import {ClientUser} from '../connection';

export interface IService {
    /**
     * @throws ErrorInterface
     * @param fidjId
     * @param options
     */
    init(fidjId?: string, options?: ModuleServiceInitOptionsInterface): Promise<void>;

    /**
     * @throws ErrorInterface
     * @param login
     * @param password
     */
    login(login: string, password: string): Promise<ClientUser>;

    /**
     * @throws ErrorInterface
     * @param options
     */
    loginInDemoMode(options?: ModuleServiceLoginOptionsInterface): Promise<ClientUser>;

    // Convenience: init + login in one call (reduces cognitive load)
    initAndLogin(
        login: string,
        password: string,
        fidjId?: string,
        options?: ModuleServiceInitOptionsInterface
    ): Promise<ClientUser>;

    // Convenience: init in demo/sandbox mode with mock tokens
    initDemo(fidjId?: string, options?: ModuleServiceInitOptionsInterface): Promise<ClientUser>;

    /**
     * @throws ErrorInterface
     * @param input
     */
    sendOnEndpoint<TData = any, TResponse = any>(
        input: EndpointCallInterface<TData>
    ): Promise<{status: number; data?: TResponse}>;
}
