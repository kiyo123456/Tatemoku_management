import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    MEMBER = "member"
}
export interface UserWithRole {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    is_super_admin: boolean;
}
export interface AuthenticatedRequestWithRole extends AuthenticatedRequest {
    user?: UserWithRole;
}
export declare const checkGroupAdminStatus: (userId: string, groupId: string) => Promise<boolean>;
export declare const checkSubgroupAdminStatus: (userId: string, subgroupId: string) => Promise<boolean>;
export declare const requireSuperAdmin: (req: AuthenticatedRequestWithRole, res: Response, next: NextFunction) => void;
export declare const requireGroupAdmin: (groupIdParam?: string) => (req: AuthenticatedRequestWithRole, res: Response, next: NextFunction) => Promise<void>;
export declare const hasPermission: (user: UserWithRole, requiredRole: UserRole) => boolean;
export declare const isSuperAdmin: (user: UserWithRole) => boolean;
export declare const isGroupAdmin: (user: UserWithRole) => boolean;
//# sourceMappingURL=permissions.d.ts.map