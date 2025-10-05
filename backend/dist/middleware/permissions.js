"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGroupAdmin = exports.isSuperAdmin = exports.hasPermission = exports.requireGroupAdmin = exports.requireSuperAdmin = exports.checkSubgroupAdminStatus = exports.checkGroupAdminStatus = exports.UserRole = void 0;
const database_1 = require("../lib/database");
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["ADMIN"] = "admin";
    UserRole["MEMBER"] = "member";
})(UserRole || (exports.UserRole = UserRole = {}));
const checkGroupAdminStatus = async (userId, groupId) => {
    try {
        const db = (0, database_1.getDatabase)();
        const user = await db.get('SELECT is_super_admin, role FROM users WHERE id = ?', [userId]);
        if (user && user.is_super_admin) {
            return true;
        }
        const membership = await db.get('SELECT role FROM group_members WHERE user_id = ? AND group_id = ?', [userId, groupId]);
        return membership && membership.role === 'admin';
    }
    catch (error) {
        console.error('グループ管理者権限確認エラー:', error);
        return false;
    }
};
exports.checkGroupAdminStatus = checkGroupAdminStatus;
const checkSubgroupAdminStatus = async (userId, subgroupId) => {
    try {
        const db = (0, database_1.getDatabase)();
        const user = await db.get('SELECT is_super_admin, role FROM users WHERE id = ?', [userId]);
        if (user && user.is_super_admin) {
            return true;
        }
        const subgroup = await db.get('SELECT admin_id FROM sub_groups WHERE id = ? AND admin_id = ?', [subgroupId, userId]);
        return !!subgroup;
    }
    catch (error) {
        console.error('サブグループ管理者権限確認エラー:', error);
        return false;
    }
};
exports.checkSubgroupAdminStatus = checkSubgroupAdminStatus;
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            error: '認証が必要です',
            message: '有効なアクセストークンが必要です'
        });
        return;
    }
    if (!req.user.is_super_admin) {
        res.status(403).json({
            error: 'アクセス拒否',
            message: 'スーパー管理者権限が必要です'
        });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
const requireGroupAdmin = (groupIdParam = 'groupId') => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: '認証が必要です',
                message: '有効なアクセストークンが必要です'
            });
            return;
        }
        const groupId = req.params[groupIdParam];
        if (!groupId) {
            res.status(400).json({
                error: 'グループIDが必要です',
                message: `${groupIdParam}パラメータが必要です`
            });
            return;
        }
        const user = req.user;
        if (user.is_super_admin) {
            return next();
        }
        try {
            const isGroupAdmin = await (0, exports.checkGroupAdminStatus)(user.id, groupId);
            if (!isGroupAdmin) {
                res.status(403).json({
                    error: 'アクセス権限がありません',
                    message: 'このグループの管理権限がありません'
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('権限確認エラー:', error);
            res.status(500).json({
                error: 'サーバーエラー',
                message: '権限確認中にエラーが発生しました'
            });
            return;
        }
    };
};
exports.requireGroupAdmin = requireGroupAdmin;
const hasPermission = (user, requiredRole) => {
    const roleHierarchy = {
        [UserRole.MEMBER]: 0,
        [UserRole.ADMIN]: 1,
        [UserRole.SUPER_ADMIN]: 2
    };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};
exports.hasPermission = hasPermission;
const isSuperAdmin = (user) => {
    return user.is_super_admin;
};
exports.isSuperAdmin = isSuperAdmin;
const isGroupAdmin = (user) => {
    return user.role === UserRole.ADMIN || user.is_super_admin;
};
exports.isGroupAdmin = isGroupAdmin;
//# sourceMappingURL=permissions.js.map