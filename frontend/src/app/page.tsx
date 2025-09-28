'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

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
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            縦もく日程調整自動化システム
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Googleカレンダーと連携して、最適な縦もく開催日時を自動提案
          </p>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="text-lg font-semibold mb-2">カレンダー連携</h3>
              <p className="text-gray-600">
                Googleカレンダーから自動で空き時間を取得
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">自動分析</h3>
              <p className="text-gray-600">
                全メンバーの共通空き時間を瞬時に分析
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-3xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">最適提案</h3>
              <p className="text-gray-600">
                参加可能人数を考慮した最適な日程を提案
              </p>
            </div>
          </div>

          <div className="mt-12 space-y-4">
            <Link
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200"
            >
              Googleアカウントで始める
            </Link>
            <p className="text-sm text-gray-500">
              5期生・縦もくメンバー専用システム
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
