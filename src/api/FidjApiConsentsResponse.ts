// GET /me/consents — GDPR Art. 7/15
export interface FidjApiConsentsResponse {
    terms: boolean;
    termsVersion?: string;
    termsAcceptedAt?: string;
    analytics: boolean;
    communications: boolean;
    optionalData: boolean;
    updatedAt?: string;
}
