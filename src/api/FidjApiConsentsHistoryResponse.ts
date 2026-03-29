// GET /me/consents/history — GDPR Art. 7
export interface FidjApiConsentHistoryEntry {
    type: 'terms' | 'analytics' | 'communications' | 'optionalData';
    granted: boolean;
    changedAt: string;
    source: 'signup' | 'profile' | 'api';
    cguVersion?: string;
}

export interface FidjApiConsentsHistoryResponse {
    history: FidjApiConsentHistoryEntry[];
}
