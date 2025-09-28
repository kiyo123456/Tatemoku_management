'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  redirectTo = '/login'
}: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requireSuperAdmin && !Boolean(user?.is_super_admin)) {
        router.push('/dashboard?error=access_denied');
        return;
      }

      if (requireAdmin && user?.role !== 'admin' && !Boolean(user?.is_super_admin)) {
        router.push('/dashboard?error=access_denied');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router, requireAdmin, requireSuperAdmin, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireSuperAdmin && !Boolean(user?.is_super_admin)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600 mb-6">この機能を利用するには、スーパー管理者権限が必要です。</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  if (requireAdmin && user?.role !== 'admin' && !Boolean(user?.is_super_admin)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600 mb-6">この機能を利用するには、管理者権限が必要です。</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function useRoleCheck() {
  const { user } = useAuth();

  return {
    isSuperAdmin: Boolean(user?.is_super_admin),
    isAdmin: user?.role === 'admin' || Boolean(user?.is_super_admin),
    isMember: user?.role === 'member',
    canAccessAdmin: user?.role === 'admin' || Boolean(user?.is_super_admin),
    canAccessSuperAdmin: Boolean(user?.is_super_admin)
  };
}