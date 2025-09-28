'use client';

import React, { useState, useEffect } from 'react';
import { TatemokuGroup, Member, ChangeLog, TatemokuManagementState } from '@/types/tatemoku';
import { UnassignedMembersArea } from './UnassignedMembersArea';
import { TatemokuGroupCard } from './TatemokuGroupCard';
import { ChangeLogModal } from './ChangeLogModal';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { tatemokuAPI } from '@/utils/api';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function TatemokuManagement() {
  const { user } = useAuth();
  const { userPermission, isGroupManager, isSuperAdmin, managedGroupIds } = usePermissions();
  const [state, setState] = useState<TatemokuManagementState>({
    groups: [],
    unassignedMembers: [],
    allMembers: [],
    changeLogs: [],
    loading: true,
    error: null
  });

  const [showChangeLog, setShowChangeLog] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    // 今週の月曜日を取得
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return monday.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadTatemokuData();
  }, [selectedWeek]);

  const loadTatemokuData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 縦もくグループデータを取得
      const groupsData = await tatemokuAPI.getGroups();

      // 変更履歴を取得
      const logsData = await tatemokuAPI.getChangeLogs();

      setState(prev => ({
        ...prev,
        groups: groupsData.groups,
        unassignedMembers: groupsData.unassignedMembers,
        allMembers: [...groupsData.groups.flatMap((g: TatemokuGroup) => g.participants), ...groupsData.unassignedMembers],
        changeLogs: logsData.logs,
        loading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.response?.data?.error || 'データの読み込みに失敗しました',
        loading: false
      }));
    }
  };

  const handleMemberMove = async (memberId: number, fromGroupId: number | null, toGroupId: number | null) => {
    try {
      // 現在のバージョンを取得（楽観的ロック用）
      const targetGroup = toGroupId ? state.groups.find(g => g.id === toGroupId) : null;
      const version = targetGroup?.version || 1;

      // APIを呼び出して参加者を移動
      await tatemokuAPI.moveParticipant({
        memberId,
        fromGroupId: fromGroupId || undefined,
        toGroupId: toGroupId || undefined,
        version
      });

      // 楽観的更新
      setState(prev => {
        const newState = { ...prev };
        const member = newState.allMembers.find(m => m.id === memberId);
        if (!member) return prev;

        // 移動元から削除
        if (fromGroupId) {
          const fromGroup = newState.groups.find(g => g.id === fromGroupId);
          if (fromGroup) {
            fromGroup.participants = fromGroup.participants.filter(p => p.id !== memberId);
          }
        } else {
          newState.unassignedMembers = newState.unassignedMembers.filter(m => m.id !== memberId);
        }

        // 移動先に追加
        if (toGroupId) {
          const toGroup = newState.groups.find(g => g.id === toGroupId);
          if (toGroup) {
            toGroup.participants.push(member);
          }
        } else {
          newState.unassignedMembers.push(member);
        }

        return newState;
      });

      // 履歴を再読み込み
      const logsData = await tatemokuAPI.getChangeLogs();
      setState(prev => ({
        ...prev,
        changeLogs: logsData.logs
      }));

    } catch (error: any) {
      console.error('Failed to move member:', error);
      alert(error.response?.data?.error || '参加者の移動に失敗しました');
      // エラー時は元の状態に戻す
      loadTatemokuData();
    }
  };

  const handleCreateCalendarEvent = async (groupId: number, includeInvites: boolean = true) => {
    try {
      // Google Access Tokenを取得（ここではローカルストレージから取得）
      const tokens = localStorage.getItem('tokens');
      let googleAccessToken = '';

      if (tokens) {
        const parsedTokens = JSON.parse(tokens);
        googleAccessToken = parsedTokens.googleAccessToken || '';
      }

      if (!googleAccessToken) {
        alert('Google Access Tokenが見つかりません。ログインし直してください。');
        return;
      }

      // APIを呼び出してカレンダーイベントを作成
      const result = await tatemokuAPI.createCalendarEvent({
        groupId,
        includeParticipantInvites: includeInvites,
        googleAccessToken
      });

      // 成功時にUIを更新
      setState(prev => ({
        ...prev,
        groups: prev.groups.map(g =>
          g.id === groupId ? { ...g, calendarRegistered: true } : g
        )
      }));

      // 成功メッセージを表示
      alert(result.message);

      if (result.eventLink) {
        console.log('作成されたイベントURL:', result.eventLink);
      }

    } catch (error: any) {
      console.error('Failed to create calendar event:', error);
      alert(error.response?.data?.error || 'カレンダーイベントの作成に失敗しました');
    }
  };

  const getWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
      start: start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      end: end.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    };
  };

  if (state.loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  const weekRange = getWeekRange(selectedWeek);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            📅 週次縦もく管理 ({weekRange.start}〜{weekRange.end})
          </h1>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={() => setShowChangeLog(true)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>📊</span>
              <span>変更履歴</span>
            </Button>
          </div>
        </div>

        {/* ユーザー権限表示 */}
        {userPermission && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span>👤</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🔑</span>
                <span>
                  {isSuperAdmin && '全体管理者'}
                  {isGroupManager && `グループ管理者 (Group ${managedGroupIds.join(', ')})`}
                  {!isSuperAdmin && !isGroupManager && '参加者（閲覧のみ）'}
                </span>
              </div>
              {isGroupManager && managedGroupIds.length > 0 && (
                <div className="text-blue-600 text-xs">
                  💡 管理グループのメンバーのみ移動可能
                </div>
              )}
            </div>
          </div>
        )}

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-blue-800 font-medium">総グループ数</div>
            <div className="text-2xl font-bold text-blue-900">{state.groups.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-800 font-medium">割り当て済み</div>
            <div className="text-2xl font-bold text-green-900">
              {state.groups.reduce((sum, g) => sum + g.participants.length, 0)}名
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-yellow-800 font-medium">未割り当て</div>
            <div className="text-2xl font-bold text-yellow-900">{state.unassignedMembers.length}名</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-purple-800 font-medium">カレンダー登録済み</div>
            <div className="text-2xl font-bold text-purple-900">
              {state.groups.filter(g => g.calendarRegistered).length}/{state.groups.length}
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{state.error}</p>
        </div>
      )}

      {/* 未割り当てメンバー */}
      <UnassignedMembersArea
        members={state.unassignedMembers}
        onMemberMove={handleMemberMove}
      />

      {/* 縦もくグループ一覧 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">📋 縦もくグループ一覧</h2>

        {state.groups.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-gray-400 text-4xl mb-2">📅</div>
            <p className="text-gray-500">この週に予定されている縦もくはありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {state.groups.map((group) => (
              <TatemokuGroupCard
                key={group.id}
                group={group}
                onMemberMove={handleMemberMove}
                onCreateCalendarEvent={handleCreateCalendarEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* 変更履歴モーダル */}
      {showChangeLog && (
        <ChangeLogModal
          logs={state.changeLogs}
          onClose={() => setShowChangeLog(false)}
        />
      )}
    </div>
  );
}