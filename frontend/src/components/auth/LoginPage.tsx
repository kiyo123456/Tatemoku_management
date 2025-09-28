'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/utils/api';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('posse2-super@example.com');
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const isNewUser = urlParams.get('newUser');
    const error = urlParams.get('error');

    // URLパラメータにトークンがある場合は認証処理を優先
    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        const tokens = { accessToken: token };
        login(tokens, user);

        // 新規ユーザーの場合はウェルカム画面へ、既存ユーザーはダッシュボードへ
        if (isNewUser === 'true') {
          router.push(`/welcome?token=${token}&user=${userParam}&newUser=true`);
        } else {
          router.push('/dashboard');
        }
        return;
      } catch (error) {
        console.error('トークン処理エラー:', error);
        setError('認証情報の処理に失敗しました');
        return;
      }
    }

    if (error) {
      switch (error) {
        case 'auth_failed':
          setError('Google認証が失敗しました。再度お試しください。');
          break;
        case 'access_denied':
          setError('アクセスが拒否されました。');
          break;
        case 'invalid_data':
          setError('認証データが無効です。');
          break;
        case 'missing_data':
          setError('認証情報が不足しています。');
          break;
        default:
          setError('認証エラーが発生しました。');
      }
      return;
    }

    // URLパラメータにトークンがない場合のみ、既存の認証状態をチェック
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, login, router]);


  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authAPI.getGoogleAuthUrl();

      // サーバーからエラーレスポンス（501など）の場合の処理
      if (response.error) {
        setError(`${response.error}: ${response.message}`);
        setIsLoading(false);
        return;
      }

      // 有効なauthUrlがある場合のみリダイレクト
      if (response.authUrl && !response.authUrl.includes('...')) {
        window.location.href = response.authUrl;
      } else {
        setError('Google認証の設定が完了していません。管理者にお問い合わせください。');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Google認証URL取得エラー:', error);

      // HTTPステータスに応じたエラーメッセージ
      if (error.response?.status === 501) {
        setError(error.response?.data?.message || 'Google認証の設定が完了していません');
      } else {
        setError(error.response?.data?.message || '認証処理の開始に失敗しました');
      }
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setIsDevLoginLoading(true);
    setError(null);

    try {
      const response = await authAPI.devLogin(devEmail);

      if (response.error) {
        setError(`${response.error}: ${response.message}`);
        setIsDevLoginLoading(false);
        return;
      }

      // ログイン成功処理
      const tokens = { accessToken: response.tokens.accessToken };
      login(tokens, response.user);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('開発用ログインエラー:', error);
      setError(error.response?.data?.message || '開発用ログインに失敗しました');
      setIsDevLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            縦もく日程調整システム
          </h1>
          <p className="text-lg text-gray-600">
            Googleアカウントでログイン
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    簡単3ステップ
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>1. Googleアカウントでログイン</p>
                    <p>2. カレンダーを自動取得</p>
                    <p>3. 最適な日程を提案</p>
                  </div>
                </div>

                <Button
                  onClick={handleGoogleLogin}
                  loading={isLoading}
                  className="w-full flex items-center justify-center"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isLoading ? 'ログイン中...' : 'Googleアカウントでログイン'}
                </Button>
              </div>

              {/* 開発用ログイン */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="border-t pt-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      🧪 開発用ログイン
                    </h4>
                    <p className="text-xs text-yellow-700 mb-3">
                      テスト用: Google認証なしでログインできます
                    </p>
                    <div className="space-y-3">
                      <select
                        value={devEmail}
                        onChange={(e) => setDevEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="posse2-super@example.com">posse2-super@example.com (posse②代表)</option>
                        <option value="user1@example.com">user1@example.com (田中太郎)</option>
                        <option value="user2@example.com">user2@example.com (佐藤花子)</option>
                        <option value="user3@example.com">user3@example.com (山田次郎)</option>
                        <option value="user4@example.com">user4@example.com (鈴木美咲)</option>
                        <option value="user5@example.com">user5@example.com (高橋健一)</option>
                      </select>
                      <Button
                        onClick={handleDevLogin}
                        loading={isDevLoginLoading}
                        className="w-full"
                        variant="secondary"
                        size="sm"
                      >
                        {isDevLoginLoading ? 'ログイン中...' : '開発用ログイン'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <p className="text-xs text-gray-500">
                  ログインすることで、
                  <a href="#" className="text-blue-600 hover:underline">利用規約</a>
                  および
                  <a href="#" className="text-blue-600 hover:underline">プライバシーポリシー</a>
                  に同意したものとみなされます
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}