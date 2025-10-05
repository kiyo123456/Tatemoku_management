'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, UserGroupIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  is_super_admin: boolean;
}

export default function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const userParam = searchParams.get('user');
    const newUserParam = searchParams.get('newUser');

    if (tokenParam && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        setUser(userData);
        localStorage.setItem('authToken', tokenParam);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('ユーザーデータの解析に失敗しました:', error);
      }
    }

    setIsLoading(false);
  }, [searchParams]);

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                ようこそ！
              </h1>
              <p className="text-xl text-gray-600">
                縦もく日程調整システムへの登録が完了しました
              </p>
            </div>

            {/* ユーザー情報表示 */}
            {user && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-md mx-auto">
                <div className="flex items-center space-x-4">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-12 w-12 rounded-full"
                    />
                  )}
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
                    <p className="text-gray-600">{user.email}</p>
                    <p className="text-sm text-blue-600 font-medium">{user.role}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 機能紹介セクション */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              セットアップ完了項目
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    アカウント作成
                  </h3>
                  <p className="text-gray-600">
                    Googleアカウントでのログインが設定され、ユーザー情報が保存されました。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    グループ参加
                  </h3>
                  <p className="text-gray-600">
                    デフォルトグループに自動的に参加しました。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 次のステップ */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              利用可能な機能
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                <UserGroupIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  グループ管理
                </h3>
                <p className="text-gray-600 text-sm">
                  メンバーの配置変更や グループ設定の管理
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                <CalendarIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  日程調整
                </h3>
                <p className="text-gray-600 text-sm">
                  縦もくセッションの 日程調整と管理
                </p>
              </div>

              <div className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                <ClockIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  スケジュール管理
                </h3>
                <p className="text-gray-600 text-sm">
                  Googleカレンダーとの 連携と自動化
                </p>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="text-center">
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
            >
              ダッシュボードに移動
            </button>
            <p className="text-gray-500 mt-4">
              いつでもダッシュボードから各機能にアクセスできます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}