export interface AuthUser { id: string; name: string; email: string; phone?: string; tokenVersion?: number; emailVerifiedAt?: Date | null; isActive?: boolean; isSuperAdmin?: boolean; platformAdminRole?: 'NONE' | 'SUPPORT' | 'SUPER_ADMIN'; adminMfaEnabled?: boolean; adminMfaSecret?: string | null; }
export interface AccessPayload { sub: string; email: string; }
