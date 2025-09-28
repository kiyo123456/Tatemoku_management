'use client';

import React from 'react';
import { ChangeLog } from '@/types/tatemoku';

interface ChangeLogModalProps {
  logs: ChangeLog[];
  onClose: () => void;
}

export function ChangeLogModal({ logs, onClose }: ChangeLogModalProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'move_participant': return '🔄';
      case 'add_participant': return '➕';
      case 'remove_participant': return '➖';
      case 'create_group': return '📅';
      case 'update_group': return '✏️';
      default: return '📝';
    }
  };

  const getActionText = (log: ChangeLog) => {
    switch (log.actionType) {
      case 'move_participant':
        const from = log.fromGroup ? log.fromGroup.name : '未割り当て';
        const to = log.toGroup ? log.toGroup.name : '未割り当て';
        return `${log.member?.name}を${from}から${to}に移動`;

      case 'add_participant':
        return `${log.member?.name}を${log.toGroup?.name}に追加`;

      case 'remove_participant':
        return `${log.member?.name}を${log.fromGroup?.name}から削除`;

      case 'create_group':
        return `${log.toGroup?.name}を作成`;

      case 'update_group':
        return `${log.toGroup?.name}を更新`;

      default:
        return '不明な操作';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📊</span>
            変更履歴
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📝</div>
              <p className="text-gray-500">まだ変更履歴がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-2xl">{getActionIcon(log.actionType)}</div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">
                          {getActionText(log)}
                        </p>

                        {/* 詳細情報 */}
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {log.member && (
                            <div className="flex items-center space-x-2">
                              <span>👤 メンバー:</span>
                              <span className="font-medium">{log.member.name}</span>
                              <span className="text-gray-500">({log.member.generation})</span>
                            </div>
                          )}

                          {log.fromGroup && log.toGroup && (
                            <div className="flex items-center space-x-2">
                              <span>📅 移動:</span>
                              <span>{log.fromGroup.name}</span>
                              <span>→</span>
                              <span>{log.toGroup.name}</span>
                            </div>
                          )}

                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <details>
                                <summary className="cursor-pointer text-gray-700">詳細情報</summary>
                                <pre className="mt-1 text-gray-600">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <div>{formatTimestamp(log.timestamp)}</div>
                      <div className="text-xs mt-1">
                        操作者: ユーザー{log.changedByUserId}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            📝 変更履歴は1ヶ月間保持されます
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}