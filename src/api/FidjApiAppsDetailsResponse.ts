import {FidjApiAppUrl} from './FidjApiAppsCreateRequest';

// GET /apps/:app_id/details (owner only)
export interface FidjApiAppsDetailsResponse {
    app: {
        id: string;
        owner: string;
        title: string;
        description?: string;
        rolesByDefault: string[];
        rolesAvailable: string[];
        homes?: string[];
        githubs?: string[];
        endpoints?: string[];
        urls?: FidjApiAppUrl[];
        tti_hours?: number;
        salt?: string;
        configurationAsJSON?: string;
    };
}
