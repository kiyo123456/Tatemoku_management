"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../middleware/permissions");
const database_1 = require("../lib/database");
const router = express_1.default.Router();
router.post('/move-member', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { userId, fromGroupId, toGroupId } = req.body;
        const user = req.user;
        if (!userId || !fromGroupId || !toGroupId) {
            return res.status(400).json({
                error: '必須パラメータが不足しています',
                message: 'userId, fromGroupId, toGroupIdは必須です'
            });
        }
        if (fromGroupId === toGroupId) {
            return res.status(400).json({
                error: '無効な操作です',
                message: '移動元と移動先が同じグループです'
            });
        }
        const db = (0, database_1.getDatabase)();
        await db.run('BEGIN TRANSACTION');
        try {
            const targetUser = await db.get('SELECT id, name, email FROM users WHERE id = ?', [userId]);
            if (!targetUser) {
                await db.run('ROLLBACK');
                return res.status(404).json({
                    error: 'ユーザーが見つかりません',
                    message: '指定されたユーザーが存在しません'
                });
            }
            const fromMembership = await db.get('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [fromGroupId, userId]);
            if (!fromMembership) {
                await db.run('ROLLBACK');
                return res.status(400).json({
                    error: '移動元グループにメンバーが存在しません',
                    message: '指定されたユーザーは移動元グループのメンバーではありません'
                });
            }
            const toGroup = await db.get('SELECT id, name FROM groups WHERE id = ?', [toGroupId]);
            if (!toGroup) {
                await db.run('ROLLBACK');
                return res.status(404).json({
                    error: '移動先グループが見つかりません',
                    message: '指定された移動先グループが存在しません'
                });
            }
            const existingMembership = await db.get('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [toGroupId, userId]);
            if (existingMembership) {
                await db.run('ROLLBACK');
                return res.status(400).json({
                    error: '既にメンバーです',
                    message: 'ユーザーは既に移動先グループのメンバーです'
                });
            }
            await db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [fromGroupId, userId]);
            await db.run('INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, datetime("now"))', [toGroupId, userId, 'member']);
            await db.run('COMMIT');
            console.log(`[SUPER_ADMIN_ACTION] ${user.email} がユーザー ${targetUser.name}(${userId}) を ${fromGroupId} から ${toGroupId} に移動`);
            return res.json({
                success: true,
                message: 'メンバーの移動が完了しました',
                operation: {
                    action: 'move_member',
                    userId,
                    userName: targetUser.name,
                    userEmail: targetUser.email,
                    fromGroupId,
                    toGroupId,
                    toGroupName: toGroup.name,
                    executedBy: user.id,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('メンバー移動エラー:', error);
        return res.status(500).json({
            error: 'メンバー移動に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.get('/groups', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const db = (0, database_1.getDatabase)();
        const result = await db.all(`
        SELECT
          g.id,
          g.name,
          g.created_at,
          admin_user.name as admin_name,
          admin_user.id as admin_id,
          COALESCE(member_count.count, 0) as member_count
        FROM groups g
        LEFT JOIN users admin_user ON g.admin_id = admin_user.id
        LEFT JOIN (
          SELECT group_id, COUNT(*) as count
          FROM group_members
          GROUP BY group_id
        ) member_count ON g.id = member_count.group_id
        ORDER BY g.created_at DESC
      `);
        const groups = result.map((row) => ({
            id: row.id,
            name: row.name,
            memberCount: parseInt(row.member_count || 0),
            adminId: row.admin_id,
            adminName: row.admin_name || 'Unknown',
            createdAt: row.created_at
        }));
        return res.json({
            groups,
            total: groups.length,
            message: '全グループ情報を取得しました'
        });
    }
    catch (error) {
        console.error('グループ一覧取得エラー:', error);
        return res.status(500).json({
            error: 'グループ一覧の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.get('/members', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { groupId } = req.query;
        const db = (0, database_1.getDatabase)();
        let query = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          gm.group_id,
          g.name as group_name,
          gm.joined_at,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM sub_group_members sgm
              WHERE sgm.user_id = u.id
            ) THEN 1
            ELSE 0
          END as has_subgroup_assignment
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
      `;
        const queryParams = [];
        if (groupId) {
            query += ' WHERE gm.group_id = ?';
            queryParams.push(groupId);
        }
        query += ' ORDER BY u.name';
        const result = await db.all(query, queryParams);
        const members = result.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            groupId: row.group_id,
            groupName: row.group_name,
            joinedAt: row.joined_at,
            hasSubgroupAssignment: row.has_subgroup_assignment
        }));
        if (groupId) {
            const unassignedMembers = members.filter(member => !member.hasSubgroupAssignment);
            return res.json({
                members: unassignedMembers,
                total: unassignedMembers.length,
                message: '未割り当てメンバー情報を取得しました'
            });
        }
        return res.json({
            members,
            total: members.length,
            message: 'メンバー情報を取得しました'
        });
    }
    catch (error) {
        console.error('メンバー一覧取得エラー:', error);
        return res.status(500).json({
            error: 'メンバー一覧の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.put('/members/:userId/role', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const user = req.user;
        if (!['member', 'admin', 'super_admin'].includes(role)) {
            return res.status(400).json({
                error: '無効な権限です',
                message: 'roleは member, admin, super_admin のいずれかである必要があります'
            });
        }
        const db = (0, database_1.getDatabase)();
        try {
            const targetUser = await db.get('SELECT id, name, email, role, is_super_admin FROM users WHERE id = ?', [userId]);
            if (!targetUser) {
                return res.status(404).json({
                    error: 'ユーザーが見つかりません',
                    message: '指定されたユーザーが存在しません'
                });
            }
            if (userId === user.id) {
                return res.status(400).json({
                    error: '自分自身の権限は変更できません',
                    message: '自分自身の権限を変更することはできません'
                });
            }
            const isSuperAdmin = role === 'super_admin';
            const dbRole = role === 'super_admin' ? 'admin' : role;
            await db.run('UPDATE users SET role = ?, is_super_admin = ?, updated_at = datetime("now") WHERE id = ?', [dbRole, isSuperAdmin ? 1 : 0, userId]);
            console.log(`[SUPER_ADMIN_ACTION] ${user.email} がユーザー ${targetUser.name}(${userId}) の権限を ${targetUser.role} から ${role} に変更`);
            return res.json({
                success: true,
                message: 'ユーザーの権限を変更しました',
                operation: {
                    action: 'change_role',
                    userId,
                    userName: targetUser.name,
                    userEmail: targetUser.email,
                    oldRole: targetUser.role,
                    newRole: role,
                    executedBy: user.id,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('権限変更エラー:', error);
            return res.status(500).json({
                error: '権限変更に失敗しました',
                message: 'データベースエラーが発生しました'
            });
        }
    }
    catch (error) {
        console.error('権限変更エラー:', error);
        return res.status(500).json({
            error: '権限変更に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.post('/subgroups', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { name, description, parentGroupId } = req.body;
        const user = req.user;
        if (!name || !parentGroupId) {
            return res.status(400).json({
                error: '必須パラメータが不足しています',
                message: 'name と parentGroupId は必須です'
            });
        }
        const db = (0, database_1.getDatabase)();
        const parentGroupCheck = await db.get('SELECT id FROM groups WHERE id = ?', [parentGroupId]);
        if (!parentGroupCheck) {
            return res.status(404).json({
                error: '親グループが見つかりません',
                message: '指定された親グループが存在しません'
            });
        }
        const subgroupId = `subgroup_${Date.now()}`;
        const result = await db.run(`INSERT INTO sub_groups (id, name, description, group_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`, [subgroupId, name, description || null, parentGroupId, user.id]);
        const subgroup = await db.get('SELECT * FROM sub_groups WHERE id = ?', [subgroupId]);
        console.log(`[SUPER_ADMIN_ACTION] ${user.email} がサブグループ「${name}」を作成`);
        return res.json({
            success: true,
            message: 'サブグループを作成しました',
            subgroup: {
                id: subgroup.id,
                name: subgroup.name,
                description: subgroup.description,
                parentGroupId: subgroup.group_id,
                createdBy: subgroup.created_by,
                createdAt: subgroup.created_at
            }
        });
    }
    catch (error) {
        console.error('サブグループ作成エラー:', error);
        return res.status(500).json({
            error: 'サブグループの作成に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.get('/subgroups/:groupId', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { groupId } = req.params;
        const db = (0, database_1.getDatabase)();
        const subgroupsResult = await db.all(`
        SELECT
          sg.id,
          sg.name,
          sg.description,
          sg.group_id,
          sg.admin_id,
          admin_user.name as admin_name,
          admin_user.email as admin_email,
          sg.admin_assigned_at,
          sg.created_at,
          COALESCE(member_count.count, 0) as member_count
        FROM sub_groups sg
        LEFT JOIN users admin_user ON sg.admin_id = admin_user.id
        LEFT JOIN (
          SELECT subgroup_id, COUNT(*) as count
          FROM sub_group_members
          GROUP BY subgroup_id
        ) member_count ON sg.id = member_count.subgroup_id
        WHERE sg.group_id = ?
        ORDER BY sg.created_at DESC
      `, [groupId]);
        const subgroups = [];
        for (const subgroup of subgroupsResult) {
            const membersResult = await db.all(`
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            sgm.joined_at as joined_at
          FROM sub_group_members sgm
          JOIN users u ON sgm.user_id = u.id
          WHERE sgm.subgroup_id = ?
          ORDER BY u.name
        `, [subgroup.id]);
            subgroups.push({
                id: subgroup.id,
                name: subgroup.name,
                description: subgroup.description,
                parentGroupId: subgroup.group_id,
                adminId: subgroup.admin_id,
                adminName: subgroup.admin_name,
                adminEmail: subgroup.admin_email,
                adminAssignedAt: subgroup.admin_assigned_at,
                memberCount: parseInt(subgroup.member_count),
                members: membersResult.map((member) => ({
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    role: member.role,
                    groupId: groupId,
                    groupName: '',
                    joinedAt: member.joined_at
                })),
                createdAt: subgroup.created_at
            });
        }
        return res.json({
            subgroups,
            total: subgroups.length,
            message: 'サブグループ一覧を取得しました'
        });
    }
    catch (error) {
        console.error('サブグループ取得エラー:', error);
        return res.status(500).json({
            error: 'サブグループ一覧の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.post('/subgroups/:subgroupId/members', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { subgroupId } = req.params;
        const { userIds } = req.body;
        const user = req.user;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                error: '無効なパラメータです',
                message: 'userIds は配列である必要があります'
            });
        }
        const db = (0, database_1.getDatabase)();
        const subgroupCheck = await db.get('SELECT id FROM sub_groups WHERE id = ?', [subgroupId]);
        if (!subgroupCheck) {
            return res.status(404).json({
                error: 'サブグループが見つかりません',
                message: '指定されたサブグループが存在しません'
            });
        }
        const userCheck = await db.all('SELECT id FROM users WHERE id IN (' + userIds.map(() => '?').join(',') + ')', userIds);
        if (userCheck.length !== userIds.length) {
            return res.status(404).json({
                error: '一部のユーザーが見つかりません',
                message: '指定されたユーザーの一部が存在しません'
            });
        }
        await db.exec('BEGIN');
        try {
            for (const userId of userIds) {
                await db.run('DELETE FROM sub_group_members WHERE subgroup_id = ? AND user_id = ?', [subgroupId, userId]);
            }
            for (const userId of userIds) {
                await db.run('INSERT INTO sub_group_members (subgroup_id, user_id) VALUES (?, ?)', [subgroupId, userId]);
            }
            await db.exec('COMMIT');
            console.log(`[SUPER_ADMIN_ACTION] ${user.email} がサブグループ ${subgroupId} に ${userIds.length} 人のメンバーを割り当て`);
            return res.json({
                success: true,
                message: `${userIds.length}人のメンバーをサブグループに割り当てました`,
                operation: {
                    action: 'assign_to_subgroup',
                    subgroupId,
                    userIds,
                    executedBy: user.id,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            await db.exec('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('サブグループメンバー割り当てエラー:', error);
        return res.status(500).json({
            error: 'メンバーの割り当てに失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.delete('/subgroups/:subgroupId/members/:memberId', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { subgroupId, memberId } = req.params;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const subgroupCheck = await db.get('SELECT id FROM sub_groups WHERE id = ?', [subgroupId]);
        if (!subgroupCheck) {
            return res.status(404).json({
                error: 'サブグループが見つかりません',
                message: '指定されたサブグループが存在しません'
            });
        }
        const memberCheck = await db.get('SELECT * FROM sub_group_members WHERE subgroup_id = ? AND user_id = ?', [subgroupId, memberId]);
        if (!memberCheck) {
            return res.status(404).json({
                error: 'メンバーが見つかりません',
                message: 'そのメンバーは指定されたサブグループに属していません'
            });
        }
        await db.run('DELETE FROM sub_group_members WHERE subgroup_id = ? AND user_id = ?', [subgroupId, memberId]);
        console.log(`[SUPER_ADMIN_ACTION] ${user.email} がサブグループ ${subgroupId} からメンバー ${memberId} を削除`);
        return res.json({
            success: true,
            message: 'メンバーをサブグループから削除しました',
            operation: {
                action: 'remove_from_subgroup',
                subgroupId,
                memberId,
                executedBy: user.id,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('サブグループメンバー削除エラー:', error);
        return res.status(500).json({
            error: 'メンバーの削除に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.delete('/members/:memberId/subgroups', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { memberId } = req.params;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const userCheck = await db.get('SELECT id FROM users WHERE id = ?', [memberId]);
        if (!userCheck) {
            return res.status(404).json({
                error: 'ユーザーが見つかりません',
                message: '指定されたユーザーが存在しません'
            });
        }
        const result = await db.run('DELETE FROM sub_group_members WHERE user_id = ?', [memberId]);
        console.log(`[SUPER_ADMIN_ACTION] ${user.email} がメンバー ${memberId} を全てのサブグループから削除`);
        return res.json({
            success: true,
            message: 'メンバーを全てのサブグループから削除しました',
            removedCount: result.changes,
            operation: {
                action: 'remove_from_all_subgroups',
                memberId,
                executedBy: user.id,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('メンバーサブグループ削除エラー:', error);
        return res.status(500).json({
            error: 'メンバーの削除に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.delete('/subgroups/:subgroupId', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { subgroupId } = req.params;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const subgroupCheck = await db.get('SELECT name FROM sub_groups WHERE id = ?', [subgroupId]);
        if (!subgroupCheck) {
            return res.status(404).json({
                error: 'サブグループが見つかりません',
                message: '指定されたサブグループが存在しません'
            });
        }
        const subgroupName = subgroupCheck.name;
        const result = await db.run('DELETE FROM sub_groups WHERE id = ?', [subgroupId]);
        if (result.changes === 0) {
            return res.status(404).json({
                error: 'サブグループが見つかりません',
                message: '削除対象のサブグループが存在しません'
            });
        }
        console.log(`[SUPER_ADMIN_ACTION] ${user.email} がサブグループ「${subgroupName}」を削除`);
        return res.json({
            success: true,
            message: 'サブグループを削除しました',
            operation: {
                action: 'delete_subgroup',
                subgroupId,
                subgroupName,
                executedBy: user.id,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('サブグループ削除エラー:', error);
        return res.status(500).json({
            error: 'サブグループの削除に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.put('/subgroups/:subgroupId/admin', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const { subgroupId } = req.params;
        const { adminId } = req.body;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        if (!adminId) {
            return res.status(400).json({
                error: '管理者IDが必要です',
                message: 'adminId は必須パラメータです'
            });
        }
        const subgroupCheck = await db.get('SELECT id, name FROM sub_groups WHERE id = ?', [subgroupId]);
        if (!subgroupCheck) {
            return res.status(404).json({
                error: 'サブグループが見つかりません',
                message: '指定されたサブグループが存在しません'
            });
        }
        const adminCheck = await db.get('SELECT id, name, email FROM users WHERE id = ?', [adminId]);
        if (!adminCheck) {
            return res.status(404).json({
                error: 'ユーザーが見つかりません',
                message: '指定されたユーザーが存在しません'
            });
        }
        const subgroupName = subgroupCheck.name;
        const adminUser = adminCheck;
        await db.run(`UPDATE sub_groups
         SET admin_id = ?, admin_assigned_at = datetime('now'), admin_assigned_by = ?
         WHERE id = ?`, [adminId, user.id, subgroupId]);
        console.log(`[SUPER_ADMIN_ACTION] ${user.email} が「${subgroupName}」サブグループの管理者に ${adminUser.name} を指定`);
        return res.json({
            success: true,
            message: 'サブグループ管理者を指定しました',
            operation: {
                action: 'assign_subgroup_admin',
                subgroupId,
                subgroupName,
                adminId,
                adminName: adminUser.name,
                adminEmail: adminUser.email,
                executedBy: user.id,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('サブグループ管理者指定エラー:', error);
        return res.status(500).json({
            error: 'サブグループ管理者の指定に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.get('/admin-users', auth_1.authenticateToken, permissions_1.requireSuperAdmin, async (req, res) => {
    try {
        const db = (0, database_1.getDatabase)();
        const adminUsers = await db.all(`
        SELECT id, name, email, role, is_super_admin
        FROM users
        WHERE role IN ('admin', 'super_admin')
        ORDER BY
          CASE
            WHEN role = 'super_admin' THEN 1
            WHEN role = 'admin' THEN 2
            ELSE 3
          END,
          name
      `);
        return res.json({
            success: true,
            adminUsers: adminUsers.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isSuperAdmin: Boolean(user.is_super_admin)
            })),
            message: '管理者一覧を取得しました'
        });
    }
    catch (error) {
        console.error('管理者一覧取得エラー:', error);
        return res.status(500).json({
            error: '管理者一覧の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map