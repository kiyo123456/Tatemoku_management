import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getDatabase } from '../lib/database';
import { AvailabilityRequest, CalendarEvent, AvailableSlot } from '../types';

interface UserTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

interface TatemokuSessionData {
  name: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  description?: string;
  attendeeEmails?: string[];
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  setCredentials(accessToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken
    });
  }

  async getUserCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('カレンダーリスト取得エラー:', error);
      throw new Error('カレンダーリストの取得に失敗しました');
    }
  }

  async getCalendarEvents(timeMin: string, timeMax: string, calendarId: string = 'primary') {
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
    } catch (error) {
      console.error('カレンダーイベント取得エラー:', error);
      throw new Error('カレンダーイベントの取得に失敗しました');
    }
  }

  async getFreeBusyInfo(userEmails: string[], timeMin: string, timeMax: string) {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items: userEmails.map(email => ({ id: email }))
        }
      });

      return response.data;
    } catch (error) {
      console.error('FreeBusy情報取得エラー:', error);
      throw new Error('空き時間情報の取得に失敗しました');
    }
  }

  async findAvailableSlots(request: AvailabilityRequest): Promise<AvailableSlot[]> {
    const { userEmails, timeMin, timeMax, duration, preferredTimes } = request;

    try {
      // FreeBusy情報を取得
      const freeBusyData = await this.getFreeBusyInfo(userEmails, timeMin, timeMax);

      const availableSlots: AvailableSlot[] = [];
      const startTime = new Date(timeMin);
      const endTime = new Date(timeMax);
      const durationMs = duration * 60 * 1000; // 分からミリ秒に変換

      // 30分刻みで空き時間をチェック
      for (let current = new Date(startTime); current <= endTime; current.setMinutes(current.getMinutes() + 30)) {
        const slotStart = new Date(current);
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        if (slotEnd > endTime) break;

        // 営業時間外を除外（9:00-18:00）
        if (slotStart.getHours() < 9 || slotEnd.getHours() > 18) continue;

        // 土日を除外
        if (slotStart.getDay() === 0 || slotStart.getDay() === 6) continue;

        const availableMembers: string[] = [];

        // 各ユーザーの空き状況をチェック
        for (const email of userEmails) {
          const userBusyTimes = freeBusyData.calendars?.[email]?.busy || [];
          let isAvailable = true;

          for (const busyPeriod of userBusyTimes) {
            const busyStart = new Date(busyPeriod.start!);
            const busyEnd = new Date(busyPeriod.end!);

            // 時間枠が忙しい時間と重複するかチェック
            if (slotStart < busyEnd && slotEnd > busyStart) {
              isAvailable = false;
              break;
            }
          }

          if (isAvailable) {
            availableMembers.push(email);
          }
        }

        // 最低2人以上が参加可能な時間枠のみ追加
        if (availableMembers.length >= 2) {
          let score = availableMembers.length;

          // 優先時間帯にボーナス点を追加
          if (preferredTimes) {
            for (const preferredTime of preferredTimes) {
              const preferredStart = new Date(preferredTime.start);
              const preferredEnd = new Date(preferredTime.end);

              if (slotStart >= preferredStart && slotEnd <= preferredEnd) {
                score += 10; // ボーナス点
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

      // スコア順でソート（参加者数と優先時間を考慮）
      return availableSlots.sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('空き時間検索エラー:', error);
      throw error;
    }
  }

  async createCalendarEvent(event: CalendarEvent) {
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
              { method: 'email', minutes: 1440 }, // 1日前
              { method: 'popup', minutes: 15 }    // 15分前
            ]
          }
        }
      });

      return response.data;
    } catch (error) {
      console.error('カレンダーイベント作成エラー:', error);
      throw new Error('カレンダーイベントの作成に失敗しました');
    }
  }

  // OAuth認証URLを生成
  generateAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId // ユーザーIDを状態パラメータとして渡す
    });
  }

  // 認証コードからトークンを取得してDBに保存
  async handleAuthCallback(code: string, userId: string): Promise<void> {
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

    } catch (error) {
      console.error('Google認証コールバック処理エラー:', error);
      throw new Error('Google認証の処理に失敗しました');
    }
  }

  // ユーザーのトークンをDBに保存
  private async saveUserTokens(userId: string, tokens: UserTokens): Promise<void> {
    const db = getDatabase();

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
    } catch (error) {
      console.error('トークン保存エラー:', error);
      throw new Error('トークンの保存に失敗しました');
    }
  }

  // ユーザーのトークンをDBから取得
  private async getUserTokens(userId: string): Promise<UserTokens | null> {
    const db = getDatabase();

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
    } catch (error) {
      console.error('トークン取得エラー:', error);
      return null;
    }
  }

  // ユーザー用にOAuth2クライアントを設定
  private async setupUserAuth(userId: string): Promise<boolean> {
    const tokens = await this.getUserTokens(userId);

    if (!tokens) {
      return false;
    }

    this.oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate
    });

    // トークンの期限をチェックして更新が必要なら実行
    if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveUserTokens(userId, {
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || tokens.refreshToken,
          expiryDate: credentials.expiry_date || undefined
        });
      } catch (error) {
        console.error('トークン更新エラー:', error);
        return false;
      }
    }

    return true;
  }

  // 縦もくセッションをGoogleカレンダーに作成
  async createTatemokuEvent(userId: string, sessionData: TatemokuSessionData): Promise<string | null> {
    try {
      const authSuccess = await this.setupUserAuth(userId);
      if (!authSuccess) {
        throw new Error('Google認証が必要です');
      }

      const eventDateTime = (date: string, time: string): string => {
        return `${date}T${time}:00+09:00`; // 日本時間
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
        sendUpdates: 'all' // 参加者に通知を送信
      });

      return response.data.id || null;

    } catch (error) {
      console.error('カレンダーイベント作成エラー:', error);
      throw new Error('カレンダーイベントの作成に失敗しました');
    }
  }

  // カレンダーイベントを更新
  async updateTatemokuEvent(userId: string, eventId: string, sessionData: TatemokuSessionData): Promise<void> {
    try {
      const authSuccess = await this.setupUserAuth(userId);
      if (!authSuccess) {
        throw new Error('Google認証が必要です');
      }

      const eventDateTime = (date: string, time: string): string => {
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

    } catch (error) {
      console.error('カレンダーイベント更新エラー:', error);
      throw new Error('カレンダーイベントの更新に失敗しました');
    }
  }

  // カレンダーイベントを削除
  async deleteTatemokuEvent(userId: string, eventId: string): Promise<void> {
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

    } catch (error) {
      console.error('カレンダーイベント削除エラー:', error);
      throw new Error('カレンダーイベントの削除に失敗しました');
    }
  }

  // ユーザーのカレンダー認証状態を確認
  async checkUserCalendarAuth(userId: string): Promise<boolean> {
    const tokens = await this.getUserTokens(userId);
    return !!tokens;
  }

  // ユーザーのカレンダー認証を解除
  async revokeUserCalendarAuth(userId: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.run('DELETE FROM google_calendar_tokens WHERE user_id = ?', [userId]);
    } catch (error) {
      console.error('認証解除エラー:', error);
      throw new Error('認証の解除に失敗しました');
    }
  }
}