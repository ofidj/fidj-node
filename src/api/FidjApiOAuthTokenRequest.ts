// POST /oauth/token
export interface FidjApiOAuthTokenRequest {
    grant_type: 'authorization_code' | 'refresh_token' | 'client_credentials';
    code?: string;
    redirect_uri?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
}
