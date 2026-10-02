export interface AuthUser { id: string; name: string; email: string; phone?: string; }
export interface AccessPayload { sub: string; email: string; }
