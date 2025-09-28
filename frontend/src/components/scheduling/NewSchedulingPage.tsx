'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { calendarAPI } from '@/utils/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface TimeSlot {
  start: string;
  end: string;
  availableMembers: string[];
  participantCount: number;
  participantRate: number;
}

export default function NewSchedulingPage() {
  const { user, tokens, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState({
    title: '',
    duration: 180,
    memberEmails: '',
    dateRange: {
      start: '',
      end: ''
    },
    timePreferences: {
      startHour: 10,
      endHour: 18,
      days: [1, 2, 3, 4, 5] // 月-金
    }
  });

  // 検索結果
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }

    // デフォルトの日付範囲を設定（今日から1週間後まで）
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    setFormData(prev => ({
      ...prev,
      dateRange: {
        start: today.toISOString().split('T')[0],
        end: nextWeek.toISOString().split('T')[0]
      }
    }));
  }, [isAuthenticated, router]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleTimePreferenceChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      timePreferences: {
        ...prev.timePreferences,
        [field]: value
      }
    }));
  };

  const searchAvailableSlots = async () => {
    if (!tokens?.googleAccessToken) {
      setError('Google認証が必要です');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userEmails = formData.memberEmails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      if (userEmails.length === 0) {
        setError('有効なメールアドレスを入力してください');
        setIsLoading(false);
        return;
      }

      const startDate = new Date(formData.dateRange.start);
      const endDate = new Date(formData.dateRange.end);

      const request = {
        userEmails,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        duration: formData.duration,
        preferredTimes: formData.timePreferences,
        accessToken: tokens.googleAccessToken
      };

      const response = await calendarAPI.findAvailableSlots(request);
      setAvailableSlots(response.data.bestSlots);
      setStep(2);
    } catch (error: any) {
      console.error('空き時間検索エラー:', error);
      setError(error.response?.data?.message || '空き時間の検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const createEvent = async (slot: TimeSlot) => {
    if (!tokens?.googleAccessToken) {
      setError('Google認証が必要です');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userEmails = formData.memberEmails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      const eventDetails = {
        summary: formData.title || '縦もく',
        start: slot.start,
        end: slot.end,
        attendees: userEmails,
        description: `縦もく日程調整システムで作成されたイベント\n\n参加可能メンバー: ${slot.participantCount}名`,
        accessToken: tokens.googleAccessToken
      };

      await calendarAPI.createEvent(eventDetails);

      // 成功メッセージと共にダッシュボードに戻る
      router.push('/dashboard?created=success');
    } catch (error: any) {
      console.error('カレンダーイベント作成エラー:', error);
      setError(error.response?.data?.message || 'カレンダーイベントの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short'
      }),
      time: date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              新しい日程調整
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ステップインジケーター */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-gray-600">条件設定</span>
            <span className="text-sm text-gray-600">結果選択</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-6">
              日程調整の条件を設定
            </h2>

            <div className="space-y-6">
              <Input
                label="縦もくのタイトル"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="例: グループA 縦もく"
              />

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  開催時間（分）
                </label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', Number(e.target.value))}
                >
                  <option value={120}>2時間</option>
                  <option value={180}>3時間</option>
                  <option value={240}>4時間</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  参加メンバーのメールアドレス（1行に1つずつ）
                </label>
                <textarea
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={5}
                  value={formData.memberEmails}
                  onChange={(e) => handleInputChange('memberEmails', e.target.value)}
                  placeholder={`member1@example.com\nmember2@example.com\nmember3@example.com`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="検索開始日"
                  type="date"
                  value={formData.dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                />
                <Input
                  label="検索終了日"
                  type="date"
                  value={formData.dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    希望開始時刻
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.timePreferences.startHour}
                    onChange={(e) => handleTimePreferenceChange('startHour', Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    希望終了時刻
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.timePreferences.endHour}
                    onChange={(e) => handleTimePreferenceChange('endHour', Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={searchAvailableSlots}
                  loading={isLoading}
                  size="lg"
                >
                  空き時間を検索
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              候補日程を選択
            </h2>

            {availableSlots.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">😔</div>
                <p className="text-gray-600 mb-2">
                  条件に合う空き時間が見つかりませんでした
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  条件を変更して再度検索してみてください
                </p>
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  条件を変更
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSlots.map((slot, index) => {
                  const startTime = formatDateTime(slot.start);
                  const endTime = formatDateTime(slot.end);

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg font-semibold text-gray-900 mr-4">
                              {startTime.date}
                            </span>
                            <span className="text-gray-600">
                              {startTime.time} - {endTime.time}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-4">
                              参加可能: {slot.participantCount}名
                            </span>
                            <span>
                              参加率: {slot.participantRate}%
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => createEvent(slot)}
                          loading={isLoading}
                          className="ml-4"
                        >
                          この日程で確定
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-start mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    条件を変更
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
