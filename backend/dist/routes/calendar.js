"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleCalendar_1 = require("../services/googleCalendar");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/calendars', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: '認証が必要です'
            });
        }
        const googleCalendarService = new googleCalendar_1.GoogleCalendarService();
        const googleAccessToken = req.headers['x-google-token'];
        if (!googleAccessToken) {
            return res.status(400).json({
                error: 'Googleアクセストークンが必要です',
                message: 'x-google-tokenヘッダーでGoogleアクセストークンを送信してください'
            });
        }
        googleCalendarService.setCredentials(googleAccessToken);
        const calendars = await googleCalendarService.getUserCalendars();
        return res.json({
            message: 'カレンダー一覧を取得しました',
            calendars: calendars.map(cal => ({
                id: cal.id,
                summary: cal.summary,
                primary: cal.primary,
                accessRole: cal.accessRole
            }))
        });
    }
    catch (error) {
        console.error('カレンダー一覧取得エラー:', error);
        return res.status(500).json({
            error: 'カレンダー一覧の取得に失敗しました',
            message: error instanceof Error ? error.message : '内部サーバーエラー'
        });
    }
});
router.get('/events', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: '認証が必要です'
            });
        }
        const { timeMin, timeMax, calendarId = 'primary' } = req.query;
        if (!timeMin || !timeMax) {
            return res.status(400).json({
                error: '検索期間の指定が必要です',
                message: 'timeMinとtimeMaxをクエリパラメータで指定してください'
            });
        }
        const googleAccessToken = req.headers['x-google-token'];
        if (!googleAccessToken) {
            return res.status(400).json({
                error: 'Googleアクセストークンが必要です'
            });
        }
        const googleCalendarService = new googleCalendar_1.GoogleCalendarService();
        googleCalendarService.setCredentials(googleAccessToken);
        const events = await googleCalendarService.getCalendarEvents(timeMin, timeMax, calendarId);
        return res.json({
            message: 'カレンダーイベントを取得しました',
            events: events.map(event => ({
                id: event.id,
                summary: event.summary,
                start: event.start,
                end: event.end,
                description: event.description,
                status: event.status
            }))
        });
    }
    catch (error) {
        console.error('カレンダーイベント取得エラー:', error);
        return res.status(500).json({
            error: 'カレンダーイベントの取得に失敗しました',
            message: error instanceof Error ? error.message : '内部サーバーエラー'
        });
    }
});
router.post('/availability', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: '認証が必要です'
            });
        }
        const { userEmails, timeMin, timeMax, duration, preferredTimes } = req.body;
        if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
            return res.status(400).json({
                error: 'ユーザーのメールアドレスが必要です',
                message: 'userEmailsは空でない配列である必要があります'
            });
        }
        if (!timeMin || !timeMax) {
            return res.status(400).json({
                error: '検索期間の指定が必要です',
                message: 'timeMinとtimeMaxを指定してください'
            });
        }
        if (!duration || duration < 30) {
            return res.status(400).json({
                error: '無効な時間設定です',
                message: '縦もくの時間は30分以上で指定してください'
            });
        }
        const googleAccessToken = req.headers['x-google-token'];
        if (!googleAccessToken) {
            return res.status(400).json({
                error: 'Googleアクセストークンが必要です'
            });
        }
        const googleCalendarService = new googleCalendar_1.GoogleCalendarService();
        googleCalendarService.setCredentials(googleAccessToken);
        const availableSlots = await googleCalendarService.findAvailableSlots({
            userEmails,
            timeMin,
            timeMax,
            duration,
            preferredTimes
        });
        const bestSlots = availableSlots.slice(0, 5);
        return res.json({
            message: '空き時間の検索が完了しました',
            data: {
                totalSlotsFound: availableSlots.length,
                bestSlots: bestSlots.map(slot => ({
                    start: slot.start.toISOString(),
                    end: slot.end.toISOString(),
                    availableMembers: slot.availableMembers,
                    participantCount: slot.participantCount,
                    participantRate: Math.round((slot.participantCount / userEmails.length) * 100)
                })),
                searchCriteria: {
                    duration,
                    participantCount: userEmails.length,
                    searchPeriod: {
                        from: timeMin,
                        to: timeMax
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('空き時間検索エラー:', error);
        return res.status(500).json({
            error: '空き時間の検索に失敗しました',
            message: error instanceof Error ? error.message : '内部サーバーエラーが発生しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=calendar.js.map