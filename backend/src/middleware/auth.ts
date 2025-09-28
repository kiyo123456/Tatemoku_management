import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../lib/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    is_super_admin: boolean;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: '認証が必要です',
      message: 'アクセストークンが提供されていません'
    });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRETが設定されていません');
    res.status(500).json({
      error: 'サーバー設定エラー',
      message: '認証設定に問題があります'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as any;

    // データベースからユーザー情報を取得
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, email, name, role, is_super_admin FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      res.status(403).json({
        error: 'ユーザーが見つかりません',
        message: '再度ログインしてください'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_super_admin: Boolean(user.is_super_admin)
    };
    next();
  } catch (err) {
    res.status(403).json({
      error: 'トークンが無効です',
      message: '再度ログインしてください'
    });
    return;
  }
};

export const generateAccessToken = (user: { id: string; email: string; name: string }): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRETが設定されていません');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    secret,
    { expiresIn: '24h' }
  );
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeUser = (user: any) => {
  const { accessToken, refreshToken, ...sanitized } = user;
  return sanitized;
};