// GET /apps/:app_id (public)
export interface FidjApiAppsPublicResponse {
    app: {
        id: string;
        title: string;
        description?: string;
    };
}
