import {ClientUser} from './ClientUser';
import {FidjNodeService} from '../sdk';
import {Connection} from './Connection';

export class OwnerUser extends ClientUser {
    constructor(
        protected service: FidjNodeService,
        protected connection: Connection,
        id: string,
        username: string,
        roles: string[]
    ) {
        super(id, username, roles);
    }

    async addRole(role: string) {
        try {
            const appId = this.connection.fidjId;
            const apis = await this.connection.getApiEndpoints();

            const appDetails = await this.service.sendOnEndpoint({
                verb: 'GET',
                defaultKeyUrl: `${apis[0].url}/apps/${appId}/details`,
            });

            // Add/Update this role to the app
            appDetails.data.app.rolesAvailable.push({type: role});
            await this.service.sendOnEndpoint({
                verb: 'POST',
                defaultKeyUrl: `${apis[0].url}/apps/${appId}`,
                data: appDetails.data.app.rolesAvailable,
            });

            // Add/update role's contract to the current user
            const userRoles = this.roles
                .map((r) => {
                    return {type: r};
                })
                .concat({type: role});
            const contract = {
                name: 'contract-' + role,
                user: this.username,
                roles: userRoles,
            };
            const resp = await this.service.sendOnEndpoint({
                verb: 'POST',
                defaultKeyUrl: `${apis[0].url}/apps/${appId}/contracts`,
                data: contract,
            });
        } catch (e) {
            console.error(e);
        }
    }
}
