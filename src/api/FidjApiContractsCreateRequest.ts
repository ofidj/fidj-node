// POST /apps/:app_id/contracts
export interface FidjApiContractsCreateRequest {
    user: string; // email or mobile
    roles: string[];
    name?: string;
}
