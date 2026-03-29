// PUT /me/consents — GDPR Art. 7/21 (granular, opt-in)
export interface FidjApiConsentsUpdateRequest {
    terms?: boolean;
    analytics?: boolean;
    communications?: boolean;
    optionalData?: boolean;
    source?: 'signup' | 'profile' | 'api';
    cguVersion?: string;
}
