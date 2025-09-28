'use client';

import { useAuth } from '@/contexts/AuthContext';
import SuperAdminPanel from '@/components/admin/SuperAdminPanel';
import { AuthGuard } from '@/middleware/authGuard';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <AuthGuard requireSuperAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">管理者パネル</h1>
                {user?.is_super_admin && (
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    スーパー管理者
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  ログイン中: {user?.name} ({user?.email})
                </span>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
                >
                  ダッシュボードに戻る
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <SuperAdminPanel />
        </main>
      </div>
    </AuthGuard>
  );
}