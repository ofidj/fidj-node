// POST /apps response (201)
export interface FidjApiAppsCreateResponse {
    app: {
        id: string;
        title: string;
        description?: string;
    };
    access_token?: string;
}
