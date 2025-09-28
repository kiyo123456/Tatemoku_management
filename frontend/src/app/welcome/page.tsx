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

export default function WelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const userParam = searchParams.get('user');
    const isNewUser = searchParams.get('newUser') === 'true';

    if (!isNewUser) {
      router.push('/dashboard');
      return;
    }

    if (tokenParam && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        setUser(userData);
        setToken(tokenParam);

        localStorage.setItem('accessToken', tokenParam);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('ユーザー情報の解析に失敗しました:', error);
        router.push('/login?error=invalid_data');
        return;
      }
    } else {
      router.push('/login?error=missing_data');
      return;
    }

    setIsLoading(false);
  }, [searchParams, router]);

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-6">ユーザー情報を取得できませんでした。</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ログイン画面に戻る
          </button>
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
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-indigo-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-white text-2xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ようこそ、{user.name}さん！
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              縦もく日程調整システムへの登録が完了しました
            </p>
            <p className="text-gray-500">
              {user.email}
            </p>
          </div>

          {/* 完了ステップ */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              セットアップ完了
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
                    デフォルトグループに自動的に参加し、メンバーロールが設定されました。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    権限設定
                  </h3>
                  <p className="text-gray-600">
                    メンバー権限が付与され、縦もくの日程調整に参加できます。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    準備完了
                  </h3>
                  <p className="text-gray-600">
                    すべての設定が完了し、すぐにシステムを利用開始できます。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 機能紹介 */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              利用できる機能
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <UserGroupIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  グループ管理
                </h3>
                <p className="text-gray-600">
                  複数のグループやサブグループに参加して、効率的に日程調整を行えます。
                </p>
              </div>

              <div className="text-center">
                <CalendarIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  カレンダー連携
                </h3>
                <p className="text-gray-600">
                  Googleカレンダーと連携して、自動的に空き時間を共有できます。
                </p>
              </div>

              <div className="text-center">
                <ClockIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  スケジュール調整
                </h3>
                <p className="text-gray-600">
                  メンバー全員の都合を考慮した最適な日程を自動的に提案します。
                </p>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="text-center">
            <button
              onClick={handleGetStarted}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
            >
              ダッシュボードを開く
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