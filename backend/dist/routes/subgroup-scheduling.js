"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const database_1 = require("../lib/database");
const router = express_1.default.Router();
router.get('/:subgroupId/members', auth_1.authenticateToken, async (req, res) => {
    try {
        const { subgroupId } = req.params;
        const db = (0, database_1.getDatabase)();
        const subgroupQuery = `
        SELECT
          sg.id as subgroup_id,
          sg.name as subgroup_name,
          g.id as group_id,
          g.name as group_name,
          sg.admin_id,
          admin_user.name as admin_name
        FROM sub_groups sg
        JOIN groups g ON sg.group_id = g.id
        LEFT JOIN users admin_user ON sg.admin_id = admin_user.id
        WHERE sg.id = ?
      `;
        const subgroupResult = await db.all(subgroupQuery, [subgroupId]);
        if (subgroupResult.length === 0) {
            return res.status(404).json({
                error: 'サブグループが見つかりません',
                message: '指定されたサブグループは存在しません'
            });
        }
        const subgroup = subgroupResult[0];
        const membersQuery = `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          sgm.joined_at
        FROM sub_group_members sgm
        JOIN users u ON sgm.user_id = u.id
        WHERE sgm.subgroup_id = ?
        ORDER BY u.name
      `;
        const membersResult = await db.all(membersQuery, [subgroupId]);
        const members = membersResult.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            joinedAt: row.joined_at
        }));
        return res.json({
            subgroup: {
                id: subgroup.subgroup_id,
                name: subgroup.subgroup_name,
                groupId: subgroup.group_id,
                groupName: subgroup.group_name,
                adminId: subgroup.admin_id,
                adminName: subgroup.admin_name
            },
            members,
            total: members.length,
            message: 'サブグループメンバー情報を取得しました'
        });
    }
    catch (error) {
        console.error('サブグループメンバー取得エラー:', error);
        return res.status(500).json({
            error: 'サブグループメンバーの取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.get('/available', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const query = `
        SELECT DISTINCT
          sg.id,
          sg.name,
          g.name as group_name,
          sg.admin_id,
          admin_user.name as admin_name,
          CASE
            WHEN sg.admin_id = ? THEN 'admin'
            WHEN sgm.user_id = ? THEN 'member'
            ELSE null
          END as user_role_in_subgroup,
          (
            SELECT COUNT(*)
            FROM sub_group_members sgm2
            WHERE sgm2.subgroup_id = sg.id
          ) as member_count
        FROM sub_groups sg
        JOIN groups g ON sg.group_id = g.id
        LEFT JOIN sub_group_members sgm ON sg.id = sgm.subgroup_id
        LEFT JOIN users admin_user ON sg.admin_id = admin_user.id
        WHERE sg.admin_id = ?
        ORDER BY sg.name
      `;
        const result = await db.all(query, [user.id, user.id, user.id]);
        const subgroups = result.map((row) => ({
            id: row.id,
            name: row.name,
            groupName: row.group_name,
            adminId: row.admin_id,
            adminName: row.admin_name,
            userRole: row.user_role_in_subgroup,
            memberCount: parseInt(row.member_count),
            canSchedule: row.user_role_in_subgroup === 'admin' || (user.role === 'super_admin')
        }));
        return res.json({
            subgroups,
            total: subgroups.length,
            message: 'アクセス可能なサブグループ情報を取得しました'
        });
    }
    catch (error) {
        console.error('サブグループ一覧取得エラー:', error);
        return res.status(500).json({
            error: 'サブグループ一覧の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=subgroup-scheduling.js.map