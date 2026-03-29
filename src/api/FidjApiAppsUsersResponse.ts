// GET /apps/:app_id/users
export interface FidjApiAppsUsersResponse {
    users: {
        owner: string;
        roles: string[];
        endDate?: string;
    }[];
}
