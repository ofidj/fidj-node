// GET /status
export interface FidjApiStatusResponse {
    'version-web'?: string;
    'version-api'?: string;
    urls?: Record<string, string>;
    'principal-app'?: string;
    'test-apps'?: string[];
    docs?: string;
}
