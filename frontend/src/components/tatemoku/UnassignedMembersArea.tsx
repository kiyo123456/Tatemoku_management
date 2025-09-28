'use client';

import React from 'react';
import { Member } from '@/types/tatemoku';
import { MemberChip } from './MemberChip';

interface UnassignedMembersAreaProps {
  members: Member[];
  onMemberMove: (memberId: number, fromGroupId: number | null, toGroupId: number | null) => void;
}

export function UnassignedMembersArea({ members, onMemberMove }: UnassignedMembersAreaProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const memberId = parseInt(e.dataTransfer.getData('text/plain'));
    const fromGroupId = parseInt(e.dataTransfer.getData('fromGroupId')) || null;

    // 未割り当てエリアに移動
    if (fromGroupId !== null) {
      onMemberMove(memberId, fromGroupId, null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-yellow-100', 'border-yellow-300');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-yellow-100', 'border-yellow-300');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🔄</span>
          未割り当てメンバー
        </h2>
        <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
          {members.length}名
        </span>
      </div>

      <div
        className="min-h-20 border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors duration-200"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {members.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-2">🎉</div>
            <p className="text-gray-500">全てのメンバーが割り当て済みです</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <MemberChip
                key={`unassigned-member-${member.id}`}
                member={member}
                fromGroupId={null}
              />
            ))}
          </div>
        )}
      </div>

      {members.length > 0 && (
        <div className="mt-3 text-sm text-gray-500">
          💡 メンバーをドラッグして縦もくグループに割り当てることができます
        </div>
      )}
    </div>
  );
}