export interface AuthUser { id: string; name: string; email: string; phone?: string; tokenVersion?: number; emailVerifiedAt?: Date | null; }
export interface AccessPayload { sub: string; email: string; }
