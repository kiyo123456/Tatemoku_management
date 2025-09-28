'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function DashboardPage() {
  const { user, logout, isAuthenticated, login } = useAuth();
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    // URLパラメータにトークンがある場合は認証処理を実行
    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        const tokens = { accessToken: token };
        login(tokens, user);

        // URLをクリーンアップ
        window.history.replaceState({}, '', '/dashboard');
        return;
      } catch (error) {
        console.error('ダッシュボードでのトークン処理エラー:', error);
        router.push('/login');
        return;
      }
    }

    // URLパラメータにトークンがなく、認証されていない場合はログインページへ
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // 成功メッセージの表示確認
    if (urlParams.get('created') === 'success') {
      setShowSuccessMessage(true);
      // URLをクリーンアップ
      window.history.replaceState({}, '', '/dashboard');
      // 5秒後にメッセージを非表示
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [isAuthenticated, login, router]);

  const handleLogout = async () => {
    logout();
    router.push('/');
  };

  const handleNewScheduling = () => {
    router.push('/scheduling/new');
  };

  const handleCalendarIntegration = () => {
    router.push('/calendar');
  };

  const handleSubgroupScheduling = () => {
    router.push('/scheduling/subgroup');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                縦もく日程調整システム
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                ようこそ、{user.name}さん
              </div>
              {/* 通知ベル */}
              <NotificationBell />
              {/* スーパー管理者のみ管理画面ボタンを表示 */}
              {user && user.is_super_admin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/admin')}
                  className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                >
                  管理者パネル
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 成功メッセージ */}
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  🎉 縦もくの日程が正常に作成されました！Googleカレンダーに追加されています。
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-400 hover:text-green-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ウェルカムセクション */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                おかえりなさい！
              </h2>
              <p className="text-gray-600">
                今日も効率的に縦もくの日程を調整しましょう
              </p>
            </div>
            <div className="text-6xl">👋</div>
          </div>
        </div>

        {/* アクションカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <div
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-200"
            onClick={handleNewScheduling}
          >
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                新しい日程調整
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              メンバーの空き時間を分析して、最適な縦もく日程を見つけましょう
            </p>
            <div className="text-blue-600 font-medium">
              今すぐ開始 →
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-200"
            onClick={handleSubgroupScheduling}
          >
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                サブグループ日程調整
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              所属するサブグループ内で効率的に縦もく日程を調整
            </p>
            <div className="text-indigo-600 font-medium">
              サブグループで調整 →
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                過去の調整履歴
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              これまでの日程調整結果を確認できます
            </p>
            <div className="text-gray-400 font-medium">
              準備中...
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-orange-200"
            onClick={handleCalendarIntegration}
          >
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                カレンダー連携
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Googleカレンダーと連携して空き時間を分析
            </p>
            <div className="text-orange-600 font-medium">
              テスト画面を開く →
            </div>
          </div>

          {user && user.is_super_admin && (
            <div
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200"
              onClick={() => router.push('/admin')}
            >
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  グループ管理
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                  スーパー管理者専用
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              縦もくグループとメンバーの管理、サブグループ作成・管理者指定
            </p>
            <div className="font-medium text-purple-600">
              管理パネルを開く →
            </div>
            </div>
          )}
        </div>

        {/* 最近の活動 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            最近の活動
          </h3>
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📅</div>
            <p className="text-gray-500">
              まだ日程調整の履歴がありません
            </p>
            <p className="text-gray-400 text-sm mt-2">
              新しい日程調整を開始して、履歴を作成しましょう
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}