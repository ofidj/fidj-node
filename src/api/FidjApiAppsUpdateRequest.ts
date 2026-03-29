import {FidjApiAppsCreateRequest} from './FidjApiAppsCreateRequest';

// PUT /apps/:app_id or POST /apps/:app_id
export type FidjApiAppsUpdateRequest = Partial<FidjApiAppsCreateRequest>;
