import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        is_super_admin: boolean;
    };
}
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateAccessToken: (user: {
    id: string;
    email: string;
    name: string;
}) => string;
export declare const validateEmail: (email: string) => boolean;
export declare const sanitizeUser: (user: any) => any;
//# sourceMappingURL=auth.d.ts.map