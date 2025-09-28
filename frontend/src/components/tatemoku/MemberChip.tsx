'use client';

import React from 'react';
import { Member } from '@/types/tatemoku';
import { canDragMember } from '@/types/permissions';
import { usePermissions } from '@/hooks/usePermissions';

interface MemberChipProps {
  member: Member;
  fromGroupId: number | null;
  size?: 'sm' | 'md';
}

export function MemberChip({ member, fromGroupId, size = 'md' }: MemberChipProps) {
  const { userPermission } = usePermissions();

  // 権限に基づいてドラッグ可能かチェック
  const isDraggable = userPermission ? canDragMember(member.id, fromGroupId, userPermission) : false;

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', member.id.toString());
    e.dataTransfer.setData('fromGroupId', fromGroupId?.toString() || '');
    e.dataTransfer.effectAllowed = 'move';

    // ドラッグ中の見た目を設定
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const getGenerationColor = (generation: string) => {
    if (generation.includes('5.0')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (generation.includes('5.5')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm'
  };

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        inline-flex items-center space-x-2 border rounded-lg transition-all duration-200
        ${sizeClasses[size]}
        ${getGenerationColor(member.generation)}
        ${isDraggable ? 'cursor-move hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}
      `}
      title={`${member.name} (${member.email})`}
    >
      <span className="font-medium">{member.name}</span>
      <span className="text-xs opacity-75">{member.generation}</span>
      {isDraggable && (
        <span className="text-xs opacity-50">⋮⋮</span>
      )}
    </div>
  );
}