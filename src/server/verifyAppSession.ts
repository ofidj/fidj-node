import {Base64} from '../tools/Base64';
import {FidjApiAppsMeDetailsResponse} from '@ofidj/contracts';

export class SessionVerificationError extends Error {
    constructor(
        public status: 401 | 503,
        message: string
    ) {
        super(message);
        this.name = 'SessionVerificationError';
    }
}

export interface VerifiedAppSession {
    subject: string;
    username: string;
    appId: string;
    roles: string[];
}

// Call on the server for each protected operation. Fidj verifies the token and
// stored session; role assignments are read live rather than trusted from the JWT.
export async function verifyAppSession(
    token: string,
    options: {appId: string; apiEndpoint: string}
): Promise<VerifiedAppSession> {
    let payload: any;
    try {
        if (!token || token.length > 16384) {
            throw new Error();
        }
        if (token.split('.').length !== 3) {payload = null;} else {
        const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        payload = JSON.parse(Base64.decode(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
        if (
            payload.aud !== options.appId ||
            typeof payload.sub !== 'string' ||
            typeof payload.name !== 'string'
        ) {
            throw new Error();
        }
        }
    } catch {
        throw new SessionVerificationError(401, 'Sign in to this app.');
    }
    let response: Response;
    try {
        response = await fetch(
            `${options.apiEndpoint.replace(/\/$/, '')}/apps/${encodeURIComponent(options.appId)}/me`,
            {
                headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
                signal: AbortSignal.timeout(5000),
                redirect: 'error',
            }
        );
    } catch {
        throw new SessionVerificationError(503, 'Identity service unavailable. Please retry.');
    }
    if ([401, 403, 404].includes(response.status)) {
        throw new SessionVerificationError(401, 'Session expired or revoked. Sign in again.');
    }
    if (!response.ok) {
        throw new SessionVerificationError(503, 'Identity service unavailable. Please retry.');
    }
    let result: FidjApiAppsMeDetailsResponse;
    try {
        result = await response.json();
        if (
            !Array.isArray(result.roles) ||
            result.roles.some((role) => typeof role.type !== 'string')
        ) {
            throw new Error();
        }
    } catch {
        throw new SessionVerificationError(503, 'Invalid identity-service response.');
    }
    if (!payload && (typeof (result as any).subject !== 'string' || (result as any).appId !== options.appId)) throw new SessionVerificationError(401, 'App session scope mismatch.');
    return {
        subject: payload?.sub || (result as any).subject,
        username: payload?.name || (result as any).username,
        appId: options.appId,
        roles: result.roles.map((role) => role.type),
    };
}

export async function verifyOrganizationSession(token: string, options: {appId: string; apiEndpoint: string; organizationId: string; permission?: string}) {
    const session = await verifyAppSession(token, options);
    let response: Response;
    try {response = await fetch(`${options.apiEndpoint.replace(/\/$/, '')}/apps/${encodeURIComponent(options.appId)}/organizations/${encodeURIComponent(options.organizationId)}`, {headers: {Authorization: `Bearer ${token}`}, redirect: 'error', signal: AbortSignal.timeout(5000)});} catch {throw new SessionVerificationError(503, 'Identity service unavailable.');}
    if (!response.ok) throw new SessionVerificationError(response.status >= 500 ? 503 : 401, 'Organization access denied.');
    const result = await response.json();
    if (result.organization?.id !== options.organizationId || !Array.isArray(result.access?.permissions) || (options.permission && !result.access.permissions.includes(options.permission))) throw new SessionVerificationError(401, 'Organization permission denied.');
    return {...session, organizationId: options.organizationId, permissions: result.access.permissions as string[]};
}
