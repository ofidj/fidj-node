// POST /apps/:app_id/tokens response (201)
export interface FidjApiTokensCreateResponse {
    token: {
        id: string;
        type: string;
        data: string;
    };
}
