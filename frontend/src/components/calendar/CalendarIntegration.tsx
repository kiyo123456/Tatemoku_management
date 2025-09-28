'use client';

import React, { useState, useEffect } from 'react';
import { calendarAPI } from '@/utils/api';
import { CalendarInfo, CalendarEvent, AvailableSlot } from '@/types/calendar';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function CalendarIntegration() {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Access Token (実際の実装では、認証時に取得したトークンを保存/管理する必要があります)
  const [googleAccessToken, setGoogleAccessToken] = useState<string>('');

  // フォーム入力
  const [timeRange, setTimeRange] = useState({
    timeMin: new Date().toISOString().slice(0, 16),
    timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [userEmails, setUserEmails] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);

  const handleLoadCalendars = async () => {
    if (!googleAccessToken) {
      setError('Google Access Tokenが必要です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await calendarAPI.getCalendars(googleAccessToken);
      setCalendars(response.calendars || []);
    } catch (err: any) {
      setError(`カレンダー読み込みエラー: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadEvents = async () => {
    if (!googleAccessToken) {
      setError('Google Access Tokenが必要です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await calendarAPI.getEvents({
        timeMin: new Date(timeRange.timeMin).toISOString(),
        timeMax: new Date(timeRange.timeMax).toISOString(),
        googleAccessToken
      });
      setEvents(response.events || []);
    } catch (err: any) {
      setError(`イベント読み込みエラー: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFindAvailableSlots = async () => {
    if (!googleAccessToken) {
      setError('Google Access Tokenが必要です');
      return;
    }

    if (!userEmails.trim()) {
      setError('参加者のメールアドレスを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const emailList = userEmails.split(',').map(email => email.trim()).filter(Boolean);
      const response = await calendarAPI.findAvailableSlots({
        userEmails: emailList,
        timeMin: new Date(timeRange.timeMin).toISOString(),
        timeMax: new Date(timeRange.timeMax).toISOString(),
        duration,
        googleAccessToken
      });
      setAvailableSlots(response.data?.bestSlots || []);
    } catch (err: any) {
      setError(`空き時間検索エラー: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">カレンダー連携テスト</h1>

      {user && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm">ログイン中: {user.name} ({user.email})</p>
        </div>
      )}

      {/* Google Access Token 入力 */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <label className="block text-sm font-medium mb-2">
          Google Access Token (テスト用)
        </label>
        <Input
          type="text"
          value={googleAccessToken}
          onChange={(e) => setGoogleAccessToken(e.target.value)}
          placeholder="Google Access Tokenを入力してください"
          className="w-full"
        />
        <p className="text-xs text-gray-600 mt-1">
          実際の実装では、認証時に取得したトークンを自動的に使用します。
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* カレンダー一覧取得 */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">カレンダー一覧</h2>
        <Button
          onClick={handleLoadCalendars}
          disabled={loading || !googleAccessToken}
          className="mb-3"
        >
          {loading ? '読み込み中...' : 'カレンダーを読み込み'}
        </Button>

        {calendars.length > 0 && (
          <div className="space-y-2">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="bg-gray-50 p-3 rounded">
                <p className="font-medium">{calendar.summary}</p>
                <p className="text-sm text-gray-600">
                  {calendar.primary && '(メインカレンダー) '}
                  権限: {calendar.accessRole}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 時間範囲設定 */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">時間範囲設定</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">開始日時</label>
            <Input
              type="datetime-local"
              value={timeRange.timeMin}
              onChange={(e) => setTimeRange(prev => ({ ...prev, timeMin: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">終了日時</label>
            <Input
              type="datetime-local"
              value={timeRange.timeMax}
              onChange={(e) => setTimeRange(prev => ({ ...prev, timeMax: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* イベント取得 */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">カレンダーイベント</h2>
        <Button
          onClick={handleLoadEvents}
          disabled={loading || !googleAccessToken}
          className="mb-3"
        >
          {loading ? '読み込み中...' : 'イベントを読み込み'}
        </Button>

        {events.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="bg-gray-50 p-3 rounded">
                <p className="font-medium">{event.summary}</p>
                <p className="text-sm text-gray-600">
                  {event.start.dateTime || event.start.date} - {event.end.dateTime || event.end.date}
                </p>
                {event.description && (
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

        {/* 空き時間検索 */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="bg-emerald-100 p-2 rounded-lg mr-3">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">空き時間検索</h2>
              <p className="text-sm text-gray-600">最適な縦もく時間を見つけます</p>
            </div>
          </div>

          <div className="space-y-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                参加者のメールアドレス
              </label>
              <Input
                type="text"
                value={userEmails}
                onChange={(e) => setUserEmails(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">カンマ区切りで複数のメールアドレスを入力してください</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所要時間 (分)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={30}>30分</option>
                  <option value={60}>60分</option>
                  <option value={90}>90分</option>
                  <option value={120}>120分</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleFindAvailableSlots}
                  disabled={loading || !googleAccessToken || !userEmails.trim()}
                  className="w-full"
                >
                  {loading ? '検索中...' : '空き時間を検索'}
                </Button>
              </div>
            </div>
          </div>

          {availableSlots.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">見つかった最適な時間</h3>
                <span className="bg-emerald-100 text-emerald-800 text-sm px-2 py-1 rounded-full">
                  {availableSlots.length}件
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableSlots.map((slot, index) => (
                  <div key={index} className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="bg-emerald-100 text-emerald-800 text-sm px-2 py-1 rounded-full mr-2">
                          #{index + 1}
                        </span>
                        <p className="font-medium text-gray-900">
                          {new Date(slot.start).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </p>
                      </div>
                      <span className="bg-emerald-600 text-emerald-50 text-sm px-3 py-1 rounded-full">
                        {slot.participantRate}% 参加可能
                      </span>
                    </div>

                    <div className="flex items-center text-gray-700 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">
                        {new Date(slot.start).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(slot.end).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>参加可能: {slot.participantCount}人</span>
                    </div>

                    <div className="text-xs text-gray-500">
                      <details className="cursor-pointer">
                        <summary className="hover:text-gray-700">参加可能メンバーを表示</summary>
                        <div className="mt-2 space-y-1">
                          {slot.availableMembers.map((email) => (
                            <span key={email} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                              {email}
                            </span>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : userEmails.trim() && !loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">🔍</div>
              <p className="text-gray-500">条件に合う空き時間が見つかりませんでした</p>
              <p className="text-sm text-gray-400 mt-1">時間範囲や参加者を調整してみてください</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">⏰</div>
              <p className="text-gray-500">空き時間をまだ検索していません</p>
              <p className="text-sm text-gray-400 mt-1">参加者のメールアドレスを入力して検索してください</p>
            </div>
          )}
        </div>
    </div>
  );
}