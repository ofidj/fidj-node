// GET /apps/:app_id/me/details (JWT auth)
export interface FidjApiAppsMeDetailsResponse {
    roles: {
        type: string;
        description?: string;
    }[];
}
