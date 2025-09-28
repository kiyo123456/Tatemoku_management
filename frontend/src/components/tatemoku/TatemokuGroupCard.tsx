'use client';

import React, { useState } from 'react';
import { TatemokuGroup } from '@/types/tatemoku';
import { MemberChip } from './MemberChip';
import { canDropToTarget } from '@/types/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import Button from '@/components/ui/Button';

interface TatemokuGroupCardProps {
  group: TatemokuGroup;
  onMemberMove: (memberId: number, fromGroupId: number | null, toGroupId: number | null) => void;
  onCreateCalendarEvent: (groupId: number, includeInvites: boolean) => void;
}

export function TatemokuGroupCard({ group, onMemberMove, onCreateCalendarEvent }: TatemokuGroupCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const { userPermission, permissions } = usePermissions();

  // このグループに対する権限をチェック
  const canManageGroup = permissions?.canEditGroup(group.id) || false;
  const canAcceptDrops = userPermission ? canDropToTarget(group.id, userPermission) : false;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // ドロップ権限チェック
    if (!canAcceptDrops) {
      alert('このグループにメンバーを追加する権限がありません');
      return;
    }

    const memberId = parseInt(e.dataTransfer.getData('text/plain'));
    const fromGroupId = parseInt(e.dataTransfer.getData('fromGroupId')) || null;

    // 同じグループにはドロップしない
    if (fromGroupId === group.id) return;

    // 定員チェック
    if (group.participants.length >= group.maxParticipants) {
      alert(`${group.name}は定員(${group.maxParticipants}名)に達しています`);
      return;
    }

    onMemberMove(memberId, fromGroupId, group.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // 子要素からのドラッグリーブイベントを無視
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleCreateCalendarEvent = async (includeInvites: boolean) => {
    setIsCreatingEvent(true);
    try {
      await onCreateCalendarEvent(group.id, includeInvites);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:mm
  };

  const occupancyRate = (group.participants.length / group.maxParticipants) * 100;
  const getOccupancyColor = () => {
    if (occupancyRate >= 100) return 'text-red-600 bg-red-50';
    if (occupancyRate >= 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border-2 p-6 transition-all duration-200
        ${isDragOver
          ? 'border-blue-300 bg-blue-50 transform scale-105'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>📅 {formatDate(group.scheduledDate)}</span>
            <span>⏰ {formatTime(group.startTime)}-{formatTime(group.endTime)}</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-sm px-2 py-1 rounded-full ${getOccupancyColor()}`}>
            👥 {group.participants.length}/{group.maxParticipants}名
          </div>
          {group.calendarRegistered && (
            <div className="text-xs text-green-600 mt-1 flex items-center">
              <span>✅</span>
              <span className="ml-1">カレンダー登録済み</span>
            </div>
          )}
        </div>
      </div>

      {/* 参加者一覧 */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">参加者</div>
        <div
          className={`
            min-h-16 border-2 border-dashed rounded-lg p-3 transition-colors duration-200
            ${isDragOver
              ? 'border-blue-400 bg-blue-100'
              : 'border-gray-300'
            }
          `}
        >
          {group.participants.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-gray-400 text-2xl mb-1">👥</div>
              <p className="text-gray-500 text-sm">まだ参加者がいません</p>
              <p className="text-gray-400 text-xs mt-1">メンバーをドラッグして追加してください</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.participants.map((member) => (
                <MemberChip
                  key={`group-${group.id}-member-${member.id}`}
                  member={member}
                  fromGroupId={group.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          {!group.calendarRegistered ? (
            <>
              {canManageGroup ? (
                <>
                  <Button
                    onClick={() => handleCreateCalendarEvent(false)}
                    disabled={isCreatingEvent || group.participants.length === 0}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    <span>📅</span>
                    <span>管理カレンダーに登録</span>
                  </Button>

                  <Button
                    onClick={() => handleCreateCalendarEvent(true)}
                    disabled={isCreatingEvent || group.participants.length === 0}
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <span>📧</span>
                    <span>個別招待付きで登録</span>
                  </Button>
                </>
              ) : (
                <div className="text-sm text-gray-500 flex items-center">
                  <span className="mr-1">🔒</span>
                  <span>管理者権限が必要です</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✅</span>
              <span>Googleカレンダーに登録済み</span>
            </div>
          )}
        </div>

        <button
          className="text-gray-400 hover:text-gray-600 text-sm"
          title="変更履歴を表示"
        >
          📊
        </button>
      </div>

      {/* 定員オーバー警告 */}
      {group.participants.length >= group.maxParticipants && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700 text-sm flex items-center">
            <span className="mr-1">⚠️</span>
            <span>定員に達しています。これ以上メンバーを追加できません。</span>
          </div>
        </div>
      )}

      {isCreatingEvent && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-700 text-sm flex items-center">
            <span className="mr-1">⏳</span>
            <span>Googleカレンダーにイベントを作成中...</span>
          </div>
        </div>
      )}
    </div>
  );
}