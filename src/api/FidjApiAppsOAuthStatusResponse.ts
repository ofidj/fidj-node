// GET /apps/:app_id/oauth
export interface FidjApiAppsOAuthStatusResponse {
    valid: boolean;
    client_id?: string;
    redirect_uri?: string;
}
