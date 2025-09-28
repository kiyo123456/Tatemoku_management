"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const database_1 = require("../lib/database");
const router = express_1.default.Router();
router.get('/sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = (0, database_1.getDatabase)();
        const sessions = await db.all(`
      SELECT
        ts.*,
        u.name as created_by_name,
        COUNT(tgm.id) as total_participants
      FROM tatemoku_sessions ts
      LEFT JOIN users u ON ts.created_by = u.id
      LEFT JOIN tatemoku_groups tg ON ts.id = tg.session_id
      LEFT JOIN tatemoku_group_members tgm ON tg.id = tgm.group_id
      GROUP BY ts.id
      ORDER BY ts.scheduled_date DESC, ts.created_at DESC
    `);
        return res.json({
            sessions: sessions.map((session) => ({
                id: session.id,
                name: session.name,
                scheduledDate: session.scheduled_date,
                startTime: session.start_time,
                endTime: session.end_time,
                maxParticipants: session.max_participants,
                status: session.status,
                calendarRegistered: session.calendar_registered,
                version: session.version,
                totalParticipants: session.total_participants || 0,
                createdBy: session.created_by_name,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            }))
        });
    }
    catch (error) {
        console.error('縦もくセッション取得エラー:', error);
        return res.status(500).json({
            error: '縦もくセッションの取得に失敗しました'
        });
    }
});
router.get('/sessions/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const db = (0, database_1.getDatabase)();
        const session = await db.get(`
      SELECT ts.*, u.name as created_by_name
      FROM tatemoku_sessions ts
      LEFT JOIN users u ON ts.created_by = u.id
      WHERE ts.id = ?
    `, [sessionId]);
        if (!session) {
            return res.status(404).json({
                error: 'セッションが見つかりません'
            });
        }
        const groups = await db.all(`
      SELECT
        tg.*,
        tgm.user_id,
        tgm.assigned_at,
        u.name as member_name,
        u.email as member_email,
        u.picture as member_picture
      FROM tatemoku_groups tg
      LEFT JOIN tatemoku_group_members tgm ON tg.id = tgm.group_id
      LEFT JOIN users u ON tgm.user_id = u.id
      WHERE tg.session_id = ?
      ORDER BY tg.group_number, tgm.assigned_at
    `, [sessionId]);
        const unassignedMembers = await db.all(`
      SELECT
        tum.user_id,
        tum.added_at,
        u.name,
        u.email,
        u.picture
      FROM tatemoku_unassigned_members tum
      JOIN users u ON tum.user_id = u.id
      WHERE tum.session_id = ?
      ORDER BY tum.added_at
    `, [sessionId]);
        const groupsMap = new Map();
        groups.forEach((row) => {
            if (!groupsMap.has(row.id)) {
                groupsMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    groupNumber: row.group_number,
                    maxMembers: row.max_members,
                    participants: []
                });
            }
            if (row.user_id) {
                groupsMap.get(row.id).participants.push({
                    id: row.user_id,
                    name: row.member_name,
                    email: row.member_email,
                    picture: row.member_picture,
                    assignedAt: row.assigned_at
                });
            }
        });
        return res.json({
            session: {
                id: session.id,
                name: session.name,
                scheduledDate: session.scheduled_date,
                startTime: session.start_time,
                endTime: session.end_time,
                maxParticipants: session.max_participants,
                status: session.status,
                calendarRegistered: session.calendar_registered,
                version: session.version,
                createdBy: session.created_by_name,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            },
            groups: Array.from(groupsMap.values()),
            unassignedMembers: unassignedMembers.map((member) => ({
                id: member.user_id,
                name: member.name,
                email: member.email,
                picture: member.picture,
                addedAt: member.added_at
            }))
        });
    }
    catch (error) {
        console.error('縦もくセッション詳細取得エラー:', error);
        return res.status(500).json({
            error: 'セッション詳細の取得に失敗しました'
        });
    }
});
router.post('/sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, scheduledDate, startTime, endTime, maxParticipants = 6 } = req.body;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        if (!name || !scheduledDate || !startTime || !endTime) {
            return res.status(400).json({
                error: '必須フィールドが不足しています',
                message: 'name, scheduledDate, startTime, endTimeは必須です'
            });
        }
        const result = await db.run(`
      INSERT INTO tatemoku_sessions (name, scheduled_date, start_time, end_time, max_participants, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, scheduledDate, startTime, endTime, maxParticipants, user.id]);
        return res.json({
            success: true,
            sessionId: result.lastID,
            message: '縦もくセッションが作成されました'
        });
    }
    catch (error) {
        console.error('縦もくセッション作成エラー:', error);
        return res.status(500).json({
            error: 'セッションの作成に失敗しました'
        });
    }
});
router.post('/sessions/:sessionId/groups', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { name, groupNumber, maxMembers = 6 } = req.body;
        const db = (0, database_1.getDatabase)();
        if (!name) {
            return res.status(400).json({
                error: 'グループ名が必要です'
            });
        }
        const result = await db.run(`
      INSERT INTO tatemoku_groups (session_id, name, group_number, max_members)
      VALUES (?, ?, ?, ?)
    `, [sessionId, name, groupNumber, maxMembers]);
        return res.json({
            success: true,
            groupId: result.lastID,
            message: 'グループが作成されました'
        });
    }
    catch (error) {
        console.error('グループ作成エラー:', error);
        return res.status(500).json({
            error: 'グループの作成に失敗しました'
        });
    }
});
router.post('/groups/:groupId/members', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const assignedBy = req.user.id;
        const db = (0, database_1.getDatabase)();
        if (!userId) {
            return res.status(400).json({
                error: 'ユーザーIDが必要です'
            });
        }
        await db.run('BEGIN TRANSACTION');
        try {
            await db.run(`
        DELETE FROM tatemoku_unassigned_members
        WHERE user_id = ? AND session_id = (
          SELECT session_id FROM tatemoku_groups WHERE id = ?
        )
      `, [userId, groupId]);
            await db.run(`
        INSERT INTO tatemoku_group_members (group_id, user_id, assigned_by)
        VALUES (?, ?, ?)
      `, [groupId, userId, assignedBy]);
            await db.run('COMMIT');
            return res.json({
                success: true,
                message: 'メンバーがグループに追加されました'
            });
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('メンバー追加エラー:', error);
        return res.status(500).json({
            error: 'メンバーの追加に失敗しました'
        });
    }
});
router.delete('/groups/:groupId/members/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const db = (0, database_1.getDatabase)();
        await db.run('BEGIN TRANSACTION');
        try {
            const result = await db.run(`
        DELETE FROM tatemoku_group_members
        WHERE group_id = ? AND user_id = ?
      `, [groupId, userId]);
            if (result.changes === 0) {
                await db.run('ROLLBACK');
                return res.status(404).json({
                    error: 'メンバーが見つかりません'
                });
            }
            const sessionId = await db.get(`
        SELECT session_id FROM tatemoku_groups WHERE id = ?
      `, [groupId]);
            await db.run(`
        INSERT INTO tatemoku_unassigned_members (session_id, user_id)
        VALUES (?, ?)
      `, [sessionId.session_id, userId]);
            await db.run('COMMIT');
            return res.json({
                success: true,
                message: 'メンバーがグループから削除されました'
            });
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('メンバー削除エラー:', error);
        return res.status(500).json({
            error: 'メンバーの削除に失敗しました'
        });
    }
});
router.post('/move-member', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId, fromGroupId, toGroupId } = req.body;
        const movedBy = req.user.id;
        const db = (0, database_1.getDatabase)();
        if (!userId) {
            return res.status(400).json({
                error: 'ユーザーIDが必要です'
            });
        }
        await db.run('BEGIN TRANSACTION');
        try {
            if (fromGroupId === null) {
                await db.run(`
          DELETE FROM tatemoku_unassigned_members
          WHERE user_id = ? AND session_id = (
            SELECT session_id FROM tatemoku_groups WHERE id = ?
          )
        `, [userId, toGroupId]);
            }
            else {
                await db.run(`
          DELETE FROM tatemoku_group_members
          WHERE group_id = ? AND user_id = ?
        `, [fromGroupId, userId]);
            }
            if (toGroupId === null) {
                const sessionId = await db.get(`
          SELECT session_id FROM tatemoku_groups WHERE id = ?
        `, [fromGroupId]);
                await db.run(`
          INSERT INTO tatemoku_unassigned_members (session_id, user_id)
          VALUES (?, ?)
        `, [sessionId.session_id, userId]);
            }
            else {
                await db.run(`
          INSERT INTO tatemoku_group_members (group_id, user_id, assigned_by)
          VALUES (?, ?, ?)
        `, [toGroupId, userId, movedBy]);
            }
            await db.run('COMMIT');
            return res.json({
                success: true,
                message: 'メンバーが移動されました'
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
            error: 'メンバーの移動に失敗しました'
        });
    }
});
router.post('/sessions/:sessionId/unassigned-members', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userIds } = req.body;
        const db = (0, database_1.getDatabase)();
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                error: 'ユーザーIDの配列が必要です'
            });
        }
        await db.run('BEGIN TRANSACTION');
        try {
            for (const userId of userIds) {
                await db.run(`
          INSERT OR IGNORE INTO tatemoku_unassigned_members (session_id, user_id)
          VALUES (?, ?)
        `, [sessionId, userId]);
            }
            await db.run('COMMIT');
            return res.json({
                success: true,
                message: `${userIds.length}人のメンバーが追加されました`
            });
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('未割り当てメンバー追加エラー:', error);
        return res.status(500).json({
            error: 'メンバーの追加に失敗しました'
        });
    }
});
router.patch('/sessions/:sessionId/calendar', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { calendarRegistered, googleCalendarEventId } = req.body;
        const db = (0, database_1.getDatabase)();
        await db.run(`
      UPDATE tatemoku_sessions
      SET calendar_registered = ?, google_calendar_event_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [calendarRegistered, googleCalendarEventId, sessionId]);
        return res.json({
            success: true,
            message: 'カレンダー登録状態が更新されました'
        });
    }
    catch (error) {
        console.error('カレンダー登録状態更新エラー:', error);
        return res.status(500).json({
            error: 'カレンダー登録状態の更新に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=tatemoku.js.map