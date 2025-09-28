'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { calendarAPI } from '@/utils/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { DragEvent, useState as useDragState } from 'react';

interface TimeSlot {
  start: string;
  end: string;
  availableMembers: string[];
  participantCount: number;
  participantRate: number;
}

interface SubgroupMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface SubgroupInfo {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  adminId: string;
  adminName: string;
}

interface AvailableSubgroup {
  id: string;
  name: string;
  groupName: string;
  adminId: string;
  adminName: string;
  userRole: 'admin' | 'member';
  memberCount: number;
  canSchedule: boolean;
}

export default function SubgroupSchedulingPage() {
  const { user, tokens, isAuthenticated } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // サブグループ選択関連
  const [availableSubgroups, setAvailableSubgroups] = useState<AvailableSubgroup[]>([]);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string>('');
  const [subgroupInfo, setSubgroupInfo] = useState<SubgroupInfo | null>(null);
  const [subgroupMembers, setSubgroupMembers] = useState<SubgroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // ドラッグ&ドロップ用の状態
  const [availableMembers, setAvailableMembers] = useState<SubgroupMember[]>([]);
  const [selectedMembersList, setSelectedMembersList] = useState<SubgroupMember[]>([]);
  const [draggedMember, setDraggedMember] = useState<SubgroupMember | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // フォームデータ
  const [formData, setFormData] = useState({
    title: '',
    duration: 180,
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
      return;
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

    fetchAvailableSubgroups();
  }, [isAuthenticated, router]);

  const fetchAvailableSubgroups = async () => {
    try {
      setIsLoading(true);
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let token = localStorage.getItem('accessToken');
      if (!token) {
        const tokensString = localStorage.getItem('tokens');
        if (tokensString) {
          try {
            const tokens = JSON.parse(tokensString);
            token = tokens.accessToken;
          } catch (error) {
            console.error('トークンのパースに失敗:', error);
          }
        }
      }
      
      console.log('Token exists:', !!token);

      const response = await fetch('/api/subgroups/available', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`サブグループの取得に失敗しました: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      setAvailableSubgroups(data.subgroups || []);
    } catch (error: any) {
      console.error('サブグループ取得エラー:', error);
      setError(error.message || 'サブグループの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubgroupMembers = async (subgroupId: string) => {
    try {
      setIsLoading(true);
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let token = localStorage.getItem('accessToken');
      if (!token) {
        const tokensString = localStorage.getItem('tokens');
        if (tokensString) {
          try {
            const tokens = JSON.parse(tokensString);
            token = tokens.accessToken;
          } catch (error) {
            console.error('トークンのパースに失敗:', error);
          }
        }
      }
      
      const response = await fetch(`/api/subgroups/${subgroupId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('サブグループメンバーの取得に失敗しました');
      }

      const data = await response.json();
      setSubgroupInfo(data.subgroup);
      setSubgroupMembers(data.members || []);
      setSelectedMembers(data.members.map((member: SubgroupMember) => member.id));

      // ドラッグ&ドロップ用の状態を初期化
      setAvailableMembers(data.members || []);
      setSelectedMembersList([]);

      setFormData(prev => ({
        ...prev,
        title: `${data.subgroup.name} 縦もく`
      }));
    } catch (error: any) {
      console.error('サブグループメンバー取得エラー:', error);
      setError(error.message || 'サブグループメンバーの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubgroupSelect = async (subgroupId: string) => {
    setSelectedSubgroupId(subgroupId);
    if (subgroupId) {
      await fetchSubgroupMembers(subgroupId);
      setStep(2);
    }
  };

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

  const handleMemberSelection = (memberId: string, isSelected: boolean) => {
    setSelectedMembers(prev => {
      if (isSelected) {
        return [...prev, memberId];
      } else {
        return prev.filter(id => id !== memberId);
      }
    });
  };

  // HTML5 ドラッグ&ドロップ処理
  const handleDragStart = (e: DragEvent<HTMLDivElement>, member: SubgroupMember, from: 'available' | 'selected') => {
    setDraggedMember(member);
    e.dataTransfer.setData('text/plain', JSON.stringify({ member, from }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, zone: 'available' | 'selected') => {
    e.preventDefault();
    setDragOverZone(zone);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // ドロップゾーンを出たときのみクリア
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverZone(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, to: 'available' | 'selected') => {
    e.preventDefault();
    setDragOverZone(null);

    if (!draggedMember) return;

    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { member, from } = data;

    // 同じエリアにドロップした場合は何もしない
    if (from === to) {
      setDraggedMember(null);
      return;
    }

    // 利用可能メンバーから選択メンバーへ
    if (from === 'available' && to === 'selected') {
      setAvailableMembers(prev => prev.filter(m => m.id !== member.id));
      setSelectedMembersList(prev => [...prev, member]);
      setSelectedMembers(prev => [...prev, member.id]);
    }

    // 選択メンバーから利用可能メンバーへ
    if (from === 'selected' && to === 'available') {
      setSelectedMembersList(prev => prev.filter(m => m.id !== member.id));
      setAvailableMembers(prev => [...prev, member]);
      setSelectedMembers(prev => prev.filter(id => id !== member.id));
    }

    setDraggedMember(null);
  };

  const handleDragEnd = () => {
    setDraggedMember(null);
    setDragOverZone(null);
  };

  const searchAvailableSlots = async () => {
    if (!tokens?.googleAccessToken) {
      setError('Google認証が必要です');
      return;
    }

    if (selectedMembersList.length === 0) {
      setError('参加メンバーを選択してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const selectedMemberEmails = selectedMembersList.map(member => member.email);

      const startDate = new Date(formData.dateRange.start);
      const endDate = new Date(formData.dateRange.end);

      const request = {
        userEmails: selectedMemberEmails,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        duration: formData.duration,
        preferredTimes: formData.timePreferences,
        accessToken: tokens.googleAccessToken
      };

      const response = await calendarAPI.findAvailableSlots(request);
      setAvailableSlots(response.data.bestSlots);
      setStep(3);
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
      const selectedMemberEmails = selectedMembersList.map(member => member.email);

      const eventDetails = {
        summary: formData.title || `${subgroupInfo?.name} 縦もく`,
        start: slot.start,
        end: slot.end,
        attendees: selectedMemberEmails,
        description: `縦もく日程調整システムで作成されたイベント\n\nサブグループ: ${subgroupInfo?.name}\n参加可能メンバー: ${slot.participantCount}名`,
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
              サブグループ日程調整
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
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-gray-600">サブグループ選択</span>
            <span className="text-sm text-gray-600">条件設定</span>
            <span className="text-sm text-gray-600">結果選択</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: サブグループ選択 */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              日程調整するサブグループを選択
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">サブグループを読み込み中...</p>
              </div>
            ) : availableSubgroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">🏘️</div>
                <p className="text-gray-600 mb-2">
                  利用可能なサブグループがありません
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  サブグループに参加するか、管理者に問い合わせてください
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  ダッシュボードに戻る
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSubgroups.map((subgroup) => (
                  <div
                    key={subgroup.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      subgroup.canSchedule
                        ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    }`}
                    onClick={() => subgroup.canSchedule && handleSubgroupSelect(subgroup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-4">
                            {subgroup.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subgroup.userRole === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {subgroup.userRole === 'admin' ? 'サブグループ管理者' : 'メンバー'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          親グループ: {subgroup.groupName}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="mr-4">
                            メンバー数: {subgroup.memberCount}名
                          </span>
                          {subgroup.adminName && (
                            <span>
                              管理者: {subgroup.adminName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        {subgroup.canSchedule ? (
                          <div className="text-blue-600 font-medium">
                            選択 →
                          </div>
                        ) : (
                          <div className="text-gray-400 font-medium">
                            権限なし
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: 条件設定とメンバー選択 */}
        {step === 2 && subgroupInfo && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                日程調整の条件を設定
              </h2>
              <div className="text-sm text-gray-600">
                選択中: {subgroupInfo.name}
              </div>
            </div>

            <div className="space-y-6">
              <Input
                label="縦もくのタイトル"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="例: グループA 縦もく"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  参加メンバー選択（ドラッグ&ドロップで移動）
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* 利用可能メンバー */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">利用可能メンバー</h3>
                    <div
                      className={`min-h-32 max-h-64 overflow-y-auto border-2 border-dashed rounded-md p-3 transition-colors ${
                        dragOverZone === 'available'
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, 'available')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'available')}
                    >
                      {availableMembers.map((member) => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, member, 'available')}
                          onDragEnd={handleDragEnd}
                          className={`mb-2 p-2 bg-white border rounded shadow-sm cursor-move transition-all hover:shadow-md ${
                            draggedMember?.id === member.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                      ))}
                      {availableMembers.length === 0 && (
                        <div className="text-gray-400 text-sm text-center py-4">
                          メンバーなし
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 選択済みメンバー */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      選択済みメンバー ({selectedMembersList.length}名)
                    </h3>
                    <div
                      className={`min-h-32 max-h-64 overflow-y-auto border-2 border-dashed rounded-md p-3 transition-colors ${
                        dragOverZone === 'selected'
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, 'selected')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'selected')}
                    >
                      {selectedMembersList.map((member) => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, member, 'selected')}
                          onDragEnd={handleDragEnd}
                          className={`mb-2 p-2 bg-green-100 border border-green-200 rounded shadow-sm cursor-move transition-all hover:shadow-md ${
                            draggedMember?.id === member.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="font-medium text-green-900 text-sm">{member.name}</div>
                          <div className="text-xs text-green-600">{member.email}</div>
                        </div>
                      ))}
                      {selectedMembersList.length === 0 && (
                        <div className="text-gray-400 text-sm text-center py-4">
                          ここにメンバーをドロップ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  💡 メンバーをドラッグ&ドロップして選択/解除できます
                </p>
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

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  サブグループ選択に戻る
                </Button>
                <Button
                  onClick={searchAvailableSlots}
                  loading={isLoading}
                  size="lg"
                  disabled={selectedMembersList.length === 0}
                >
                  空き時間を検索
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 結果選択 */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                候補日程を選択
              </h2>
              <div className="text-sm text-gray-600">
                {subgroupInfo?.name} - {selectedMembersList.length}名選択中
              </div>
            </div>

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
                  onClick={() => setStep(2)}
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
                    onClick={() => setStep(2)}
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
