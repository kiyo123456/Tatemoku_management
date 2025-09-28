import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { getDatabase } from '../lib/database';

// 権限レベル定義
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MEMBER = 'member'
}

// 拡張されたユーザーインターフェース
export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_super_admin: boolean;
}

export interface AuthenticatedRequestWithRole extends AuthenticatedRequest {
  user?: UserWithRole;
}

// データベースでグループ管理者権限を確認
export const checkGroupAdminStatus = async (userId: string, groupId: string): Promise<boolean> => {
  try {
    const db = getDatabase();

    // ユーザーがスーパー管理者かチェック
    const user = await db.get(
      'SELECT is_super_admin, role FROM users WHERE id = ?',
      [userId]
    );

    if (user && user.is_super_admin) {
      return true;
    }

    // グループでの管理者権限をチェック
    const membership = await db.get(
      'SELECT role FROM group_members WHERE user_id = ? AND group_id = ?',
      [userId, groupId]
    );

    return membership && membership.role === 'admin';

  } catch (error) {
    console.error('グループ管理者権限確認エラー:', error);
    return false;
  }
};

// サブグループ管理者権限確認
export const checkSubgroupAdminStatus = async (userId: string, subgroupId: string): Promise<boolean> => {
  try {
    const db = getDatabase();

    // ユーザーがスーパー管理者かチェック
    const user = await db.get(
      'SELECT is_super_admin, role FROM users WHERE id = ?',
      [userId]
    );

    if (user && user.is_super_admin) {
      return true;
    }

    // サブグループの管理者指定をチェック
    const subgroup = await db.get(
      'SELECT admin_id FROM sub_groups WHERE id = ? AND admin_id = ?',
      [subgroupId, userId]
    );

    return !!subgroup;

  } catch (error) {
    console.error('サブグループ管理者権限確認エラー:', error);
    return false;
  }
};

// スーパー管理者権限が必要なミドルウェア
export const requireSuperAdmin = (
  req: AuthenticatedRequestWithRole,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: '認証が必要です',
      message: '有効なアクセストークンが必要です'
    });
    return;
  }

  if (!req.user.is_super_admin) {
    res.status(403).json({
      error: 'アクセス拒否',
      message: 'スーパー管理者権限が必要です'
    });
    return;
  }

  next();
};

// 特定グループの管理権限が必要なミドルウェア
export const requireGroupAdmin = (groupIdParam: string = 'groupId') => {
  return async (
    req: AuthenticatedRequestWithRole,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: '認証が必要です',
        message: '有効なアクセストークンが必要です'
      });
      return;
    }

    const groupId = req.params[groupIdParam];
    if (!groupId) {
      res.status(400).json({
        error: 'グループIDが必要です',
        message: `${groupIdParam}パラメータが必要です`
      });
      return;
    }

    const user = req.user;

    // スーパー管理者は全グループにアクセス可能
    if (user.is_super_admin) {
      return next();
    }

    // データベースからグループメンバーシップを確認
    try {
      const isGroupAdmin = await checkGroupAdminStatus(user.id, groupId);

      if (!isGroupAdmin) {
        res.status(403).json({
          error: 'アクセス権限がありません',
          message: 'このグループの管理権限がありません'
        });
        return;
      }

      next();

    } catch (error) {
      console.error('権限確認エラー:', error);
      res.status(500).json({
        error: 'サーバーエラー',
        message: '権限確認中にエラーが発生しました'
      });
      return;
    }
  };
};

// 権限レベル確認ヘルパー関数
export const hasPermission = (
  user: UserWithRole,
  requiredRole: UserRole
): boolean => {
  const roleHierarchy = {
    [UserRole.MEMBER]: 0,
    [UserRole.ADMIN]: 1,
    [UserRole.SUPER_ADMIN]: 2
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};

// スーパー管理者確認ヘルパー
export const isSuperAdmin = (user: UserWithRole): boolean => {
  return user.is_super_admin;
};

// グループ管理者確認ヘルパー
export const isGroupAdmin = (user: UserWithRole): boolean => {
  return user.role === UserRole.ADMIN || user.is_super_admin;
};