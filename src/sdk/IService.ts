import {EndpointCallInterface, ModuleServiceInitOptionsInterface, ModuleServiceLoginOptionsInterface} from './Interfaces';
import {ClientUser} from '../connection';

export interface IService {

    /**
     * @throws ErrorInterface
     * @param fidjId
     * @param options
     */
    init(fidjId: string, options?: ModuleServiceInitOptionsInterface): Promise<void>;

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

    /**
     * @throws ErrorInterface
     * @param input
     */
    sendOnEndpoint(input: EndpointCallInterface): Promise<{ status: number, data?: any }>;
}
