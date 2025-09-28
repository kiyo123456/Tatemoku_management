"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const googleapis_1 = require("googleapis");
const database_1 = require("../lib/database");
class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    setCredentials(accessToken) {
        this.oauth2Client.setCredentials({
            access_token: accessToken
        });
    }
    async getUserCalendars() {
        try {
            const response = await this.calendar.calendarList.list();
            return response.data.items || [];
        }
        catch (error) {
            console.error('カレンダーリスト取得エラー:', error);
            throw new Error('カレンダーリストの取得に失敗しました');
        }
    }
    async getCalendarEvents(timeMin, timeMax, calendarId = 'primary') {
        try {
            const response = await this.calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 250
            });
            return response.data.items || [];
        }
        catch (error) {
            console.error('カレンダーイベント取得エラー:', error);
            throw new Error('カレンダーイベントの取得に失敗しました');
        }
    }
    async getFreeBusyInfo(userEmails, timeMin, timeMax) {
        try {
            const response = await this.calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: userEmails.map(email => ({ id: email }))
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('FreeBusy情報取得エラー:', error);
            throw new Error('空き時間情報の取得に失敗しました');
        }
    }
    async findAvailableSlots(request) {
        const { userEmails, timeMin, timeMax, duration, preferredTimes } = request;
        try {
            const freeBusyData = await this.getFreeBusyInfo(userEmails, timeMin, timeMax);
            const availableSlots = [];
            const startTime = new Date(timeMin);
            const endTime = new Date(timeMax);
            const durationMs = duration * 60 * 1000;
            for (let current = new Date(startTime); current <= endTime; current.setMinutes(current.getMinutes() + 30)) {
                const slotStart = new Date(current);
                const slotEnd = new Date(slotStart.getTime() + durationMs);
                if (slotEnd > endTime)
                    break;
                if (slotStart.getHours() < 9 || slotEnd.getHours() > 18)
                    continue;
                if (slotStart.getDay() === 0 || slotStart.getDay() === 6)
                    continue;
                const availableMembers = [];
                for (const email of userEmails) {
                    const userBusyTimes = freeBusyData.calendars?.[email]?.busy || [];
                    let isAvailable = true;
                    for (const busyPeriod of userBusyTimes) {
                        const busyStart = new Date(busyPeriod.start);
                        const busyEnd = new Date(busyPeriod.end);
                        if (slotStart < busyEnd && slotEnd > busyStart) {
                            isAvailable = false;
                            break;
                        }
                    }
                    if (isAvailable) {
                        availableMembers.push(email);
                    }
                }
                if (availableMembers.length >= 2) {
                    let score = availableMembers.length;
                    if (preferredTimes) {
                        for (const preferredTime of preferredTimes) {
                            const preferredStart = new Date(preferredTime.start);
                            const preferredEnd = new Date(preferredTime.end);
                            if (slotStart >= preferredStart && slotEnd <= preferredEnd) {
                                score += 10;
                                break;
                            }
                        }
                    }
                    availableSlots.push({
                        start: slotStart,
                        end: slotEnd,
                        availableMembers,
                        participantCount: availableMembers.length,
                        score
                    });
                }
            }
            return availableSlots.sort((a, b) => b.score - a.score);
        }
        catch (error) {
            console.error('空き時間検索エラー:', error);
            throw error;
        }
    }
    async createCalendarEvent(event) {
        try {
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: event.summary,
                    description: event.description,
                    start: {
                        dateTime: event.start.toISOString(),
                        timeZone: 'Asia/Tokyo'
                    },
                    end: {
                        dateTime: event.end.toISOString(),
                        timeZone: 'Asia/Tokyo'
                    },
                    attendees: event.attendees.map(email => ({ email })),
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 1440 },
                            { method: 'popup', minutes: 15 }
                        ]
                    }
                }
            });
            return response.data;
        }
        catch (error) {
            console.error('カレンダーイベント作成エラー:', error);
            throw new Error('カレンダーイベントの作成に失敗しました');
        }
    }
    generateAuthUrl(userId) {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: userId
        });
    }
    async handleAuthCallback(code, userId) {
        try {
            const { tokens } = await this.oauth2Client.getAccessToken(code);
            if (!tokens.access_token) {
                throw new Error('アクセストークンの取得に失敗しました');
            }
            await this.saveUserTokens(userId, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                expiryDate: tokens.expiry_date || undefined
            });
        }
        catch (error) {
            console.error('Google認証コールバック処理エラー:', error);
            throw new Error('Google認証の処理に失敗しました');
        }
    }
    async saveUserTokens(userId, tokens) {
        const db = (0, database_1.getDatabase)();
        try {
            await db.run(`
        INSERT OR REPLACE INTO google_calendar_tokens
        (user_id, access_token, refresh_token, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
                userId,
                tokens.accessToken,
                tokens.refreshToken || null,
                tokens.expiryDate ? new Date(tokens.expiryDate).toISOString() : null
            ]);
        }
        catch (error) {
            console.error('トークン保存エラー:', error);
            throw new Error('トークンの保存に失敗しました');
        }
    }
    async getUserTokens(userId) {
        const db = (0, database_1.getDatabase)();
        try {
            const result = await db.get(`
        SELECT access_token, refresh_token, expires_at
        FROM google_calendar_tokens
        WHERE user_id = ?
      `, [userId]);
            if (!result) {
                return null;
            }
            return {
                accessToken: result.access_token,
                refreshToken: result.refresh_token || undefined,
                expiryDate: result.expires_at ? new Date(result.expires_at).getTime() : undefined
            };
        }
        catch (error) {
            console.error('トークン取得エラー:', error);
            return null;
        }
    }
    async setupUserAuth(userId) {
        const tokens = await this.getUserTokens(userId);
        if (!tokens) {
            return false;
        }
        this.oauth2Client.setCredentials({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expiry_date: tokens.expiryDate
        });
        if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
            try {
                const { credentials } = await this.oauth2Client.refreshAccessToken();
                await this.saveUserTokens(userId, {
                    accessToken: credentials.access_token,
                    refreshToken: credentials.refresh_token || tokens.refreshToken,
                    expiryDate: credentials.expiry_date || undefined
                });
            }
            catch (error) {
                console.error('トークン更新エラー:', error);
                return false;
            }
        }
        return true;
    }
    async createTatemokuEvent(userId, sessionData) {
        try {
            const authSuccess = await this.setupUserAuth(userId);
            if (!authSuccess) {
                throw new Error('Google認証が必要です');
            }
            const eventDateTime = (date, time) => {
                return `${date}T${time}:00+09:00`;
            };
            const event = {
                summary: `縦もく: ${sessionData.name}`,
                description: sessionData.description || '縦もくセッション',
                start: {
                    dateTime: eventDateTime(sessionData.scheduledDate, sessionData.startTime),
                    timeZone: 'Asia/Tokyo'
                },
                end: {
                    dateTime: eventDateTime(sessionData.scheduledDate, sessionData.endTime),
                    timeZone: 'Asia/Tokyo'
                },
                attendees: sessionData.attendeeEmails?.map(email => ({ email })) || []
            };
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
                sendUpdates: 'all'
            });
            return response.data.id || null;
        }
        catch (error) {
            console.error('カレンダーイベント作成エラー:', error);
            throw new Error('カレンダーイベントの作成に失敗しました');
        }
    }
    async updateTatemokuEvent(userId, eventId, sessionData) {
        try {
            const authSuccess = await this.setupUserAuth(userId);
            if (!authSuccess) {
                throw new Error('Google認証が必要です');
            }
            const eventDateTime = (date, time) => {
                return `${date}T${time}:00+09:00`;
            };
            const event = {
                summary: `縦もく: ${sessionData.name}`,
                description: sessionData.description || '縦もくセッション',
                start: {
                    dateTime: eventDateTime(sessionData.scheduledDate, sessionData.startTime),
                    timeZone: 'Asia/Tokyo'
                },
                end: {
                    dateTime: eventDateTime(sessionData.scheduledDate, sessionData.endTime),
                    timeZone: 'Asia/Tokyo'
                },
                attendees: sessionData.attendeeEmails?.map(email => ({ email })) || []
            };
            await this.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                requestBody: event,
                sendUpdates: 'all'
            });
        }
        catch (error) {
            console.error('カレンダーイベント更新エラー:', error);
            throw new Error('カレンダーイベントの更新に失敗しました');
        }
    }
    async deleteTatemokuEvent(userId, eventId) {
        try {
            const authSuccess = await this.setupUserAuth(userId);
            if (!authSuccess) {
                throw new Error('Google認証が必要です');
            }
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: 'all'
            });
        }
        catch (error) {
            console.error('カレンダーイベント削除エラー:', error);
            throw new Error('カレンダーイベントの削除に失敗しました');
        }
    }
    async checkUserCalendarAuth(userId) {
        const tokens = await this.getUserTokens(userId);
        return !!tokens;
    }
    async revokeUserCalendarAuth(userId) {
        const db = (0, database_1.getDatabase)();
        try {
            await db.run('DELETE FROM google_calendar_tokens WHERE user_id = ?', [userId]);
        }
        catch (error) {
            console.error('認証解除エラー:', error);
            throw new Error('認証の解除に失敗しました');
        }
    }
}
exports.GoogleCalendarService = GoogleCalendarService;
//# sourceMappingURL=googleCalendar.js.map