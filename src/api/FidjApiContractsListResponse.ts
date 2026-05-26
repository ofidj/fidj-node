// GET /apps/:app_id/contracts
export interface FidjApiContractsListResponse {
    contracts: {
        id: string;
        name?: string;
        owner: string;
        app: string;
        roles: string[];
        endDate?: string;
    }[];
}
