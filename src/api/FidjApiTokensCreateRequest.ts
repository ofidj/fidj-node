// POST /apps/:app_id/tokens
export interface FidjApiTokensCreateRequest {
    grant_type: string;
    client_udid: string;
    client_info: string;
    scope: string;
    refresh_token?: string;
    refreshCount?: number;
}
