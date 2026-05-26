// GET /me/details
export interface FidjApiUsersMeDetailsResponse {
    user: {
        id: string;
        poc: {email?: string; mobile?: string};
        username: string;
        name: string;
        appsOwned: string[];
        appsSubscribed: string[];
    };
}
