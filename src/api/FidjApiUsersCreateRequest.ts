// POST /users
export interface FidjApiUsersCreateRequest {
    username: string;
    name: string;
    password: string;
    email?: string;
    mobile?: string;
}
