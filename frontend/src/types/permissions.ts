// 権限管理システムの型定義

export enum UserRole {
  SUPER_ADMIN = 'super_admin',     // 全体管理者
  GROUP_MANAGER = 'group_manager', // グループ管理者
  PARTICIPANT = 'participant'      // 一般参加者（読み取り専用）
}

export interface UserPermission {
  userId: number;
  role: UserRole;
  managedGroupIds: number[]; // GROUP_MANAGERの場合、管理するグループのID
}

export interface PermissionCheck {
  canEditGroup: (groupId: number) => boolean;
  canMoveFromGroup: (groupId: number) => boolean;
  canMoveToGroup: (groupId: number) => boolean;
  canViewGroup: (groupId: number) => boolean;
  canCreateCalendarEvent: (groupId: number) => boolean;
}

// 権限チェック関数
export const createPermissionChecker = (userPermission: UserPermission): PermissionCheck => {
  const { role, managedGroupIds } = userPermission;

  return {
    canEditGroup: (groupId: number) => {
      if (role === UserRole.SUPER_ADMIN) return true;
      if (role === UserRole.GROUP_MANAGER) return managedGroupIds.includes(groupId);
      return false;
    },

    canMoveFromGroup: (groupId: number) => {
      if (role === UserRole.SUPER_ADMIN) return true;
      if (role === UserRole.GROUP_MANAGER) return managedGroupIds.includes(groupId);
      return false;
    },

    canMoveToGroup: (groupId: number) => {
      if (role === UserRole.SUPER_ADMIN) return true;
      if (role === UserRole.GROUP_MANAGER) return managedGroupIds.includes(groupId);
      return false;
    },

    canViewGroup: (_groupId: number) => {
      // 全ユーザーが閲覧可能
      return true;
    },

    canCreateCalendarEvent: (groupId: number) => {
      if (role === UserRole.SUPER_ADMIN) return true;
      if (role === UserRole.GROUP_MANAGER) return managedGroupIds.includes(groupId);
      return false;
    }
  };
};

// 現在のユーザーがドラッグできるメンバーかチェック
export const canDragMember = (
  memberId: number,
  currentGroupId: number | null,
  userPermission: UserPermission
): boolean => {
  const checker = createPermissionChecker(userPermission);

  // 未割り当てメンバーは誰でもドラッグ可能（SUPER_ADMINの場合）
  if (currentGroupId === null) {
    return userPermission.role === UserRole.SUPER_ADMIN;
  }

  // 自分が管理するグループのメンバーのみドラッグ可能
  return checker.canMoveFromGroup(currentGroupId);
};

// ドロップ先にドロップできるかチェック
export const canDropToTarget = (
  targetGroupId: number | null,
  userPermission: UserPermission
): boolean => {
  const checker = createPermissionChecker(userPermission);

  // 未割り当てエリアへのドロップ（SUPER_ADMINのみ）
  if (targetGroupId === null) {
    return userPermission.role === UserRole.SUPER_ADMIN;
  }

  // 自分が管理するグループへのドロップ
  return checker.canMoveToGroup(targetGroupId);
};