// POST /users response
export interface FidjApiUsersCreateResponse {
    user: {
        id: string;
        poc: {email?: string; mobile?: string};
        username: string;
        name: string;
        appsOwned: string[];
        appsSubscribed: string[];
    };
}
