// POST /apps
export interface FidjApiAppsCreateRequest {
    title: string;
    description?: string;
    urls?: FidjApiAppUrl[];
    homes?: string[];
    githubs?: string[];
    endpoints?: string[];
    dbs?: string[];
    tti_hours?: number;
    salt?: string;
    configurationAsJSON?: string;
    rolesAvailable?: string[];
    rolesByDefault?: string[];
}

export interface FidjApiAppUrl {
    type: 'home' | 'github' | 'endpoint' | 'db' | 'oauth';
    key?: string;
    url: string;
    verb?: string;
}
