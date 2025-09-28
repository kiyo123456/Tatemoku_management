"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const database_1 = require("../lib/database");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const { limit = 20, offset = 0, unread_only = false } = req.query;
        let query = `
        SELECT
          id,
          type,
          title,
          message,
          data,
          read,
          created_at,
          expires_at
        FROM notifications
        WHERE user_id = ?
      `;
        const queryParams = [user.id];
        let paramIndex = 2;
        if (unread_only === 'true') {
            query += ` AND read = FALSE`;
        }
        query += ` AND (expires_at IS NULL OR expires_at > datetime('now'))`;
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));
        const result = await db.all(query, queryParams);
        return res.json({
            notifications: result,
            total: result.length,
            message: '通知一覧を取得しました'
        });
    }
    catch (error) {
        console.error('通知取得エラー:', error);
        return res.status(500).json({
            error: '通知の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.get('/unread-count', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const result = await db.get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = FALSE', [user.id]);
        return res.json({
            count: result.count || 0,
            message: '未読通知数を取得しました'
        });
    }
    catch (error) {
        console.error('未読通知数取得エラー:', error);
        return res.status(500).json({
            error: '未読通知数の取得に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.put('/:notificationId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const result = await db.run(`UPDATE notifications
         SET read = TRUE
         WHERE id = ? AND user_id = ?`, [notificationId, user.id]);
        if (result.changes === 0) {
            return res.status(404).json({
                error: '通知が見つかりません',
                message: '指定された通知が存在しないか、アクセス権限がありません'
            });
        }
        return res.json({
            success: true,
            message: '通知を既読にしました'
        });
    }
    catch (error) {
        console.error('通知既読エラー:', error);
        return res.status(500).json({
            error: '通知の既読処理に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.put('/mark-all-read', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const result = await db.run(`UPDATE notifications
         SET read = TRUE
         WHERE user_id = ? AND read = FALSE`, [user.id]);
        return res.json({
            success: true,
            updatedCount: result.changes,
            message: `${result.changes}件の通知を既読にしました`
        });
    }
    catch (error) {
        console.error('全通知既読エラー:', error);
        return res.status(500).json({
            error: '通知の一括既読処理に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
router.delete('/:notificationId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const user = req.user;
        const db = (0, database_1.getDatabase)();
        const result = await db.run(`DELETE FROM notifications
         WHERE id = ? AND user_id = ?`, [notificationId, user.id]);
        if (result.changes === 0) {
            return res.status(404).json({
                error: '通知が見つかりません',
                message: '指定された通知が存在しないか、アクセス権限がありません'
            });
        }
        return res.json({
            success: true,
            message: '通知を削除しました'
        });
    }
    catch (error) {
        console.error('通知削除エラー:', error);
        return res.status(500).json({
            error: '通知の削除に失敗しました',
            message: 'サーバーエラーが発生しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map