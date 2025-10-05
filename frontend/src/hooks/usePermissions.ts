import { useState, useEffect } from 'react';
import { UserPermission, UserRole, createPermissionChecker } from '@/types/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { tatemokuAPI } from '@/utils/api';

export const usePermissions = () => {
  const { user } = useAuth();
  const [userPermission, setUserPermission] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserPermissions();
    }
  }, [user]);

  const loadUserPermissions = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // 実際のAPI呼び出し（現在はモックを返す）
      try {
        const response = await tatemokuAPI.getUserPermissions(user.id);
        setUserPermission(response.permissions);
      } catch (error) {
        // APIが未実装の場合はモックデータを使用
        console.log('API未実装のため、モックデータを使用します:', error);

        const mockPermission: UserPermission = {
          userId: user.id,
          role: UserRole.GROUP_MANAGER,
          managedGroupIds: [1] // Group Aを管理
        };

        setUserPermission(mockPermission);
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      // フォールバック: 参加者権限
      setUserPermission({
        userId: user?.id || 0,
        role: UserRole.PARTICIPANT,
        managedGroupIds: []
      });
    } finally {
      setLoading(false);
    }
  };

  const permissions = userPermission ? createPermissionChecker(userPermission) : null;

  return {
    userPermission,
    permissions,
    loading,
    isGroupManager: userPermission?.role === UserRole.GROUP_MANAGER,
    isSuperAdmin: userPermission?.role === UserRole.SUPER_ADMIN,
    isParticipant: userPermission?.role === UserRole.PARTICIPANT,
    managedGroupIds: userPermission?.managedGroupIds || []
  };
};