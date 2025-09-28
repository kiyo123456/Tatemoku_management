import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { generateAccessToken } from './middleware/auth';
import { initializeDatabase, testDatabaseConnection } from './lib/database';
// import calendarRoutes from './routes/calendar'; // 一時的に無効化
import tatemokuRoutes from './routes/tatemoku';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import subgroupSchedulingRoutes from './routes/subgroup-scheduling';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use('/api/calendar', calendarRoutes); // 一時的に無効化
app.use('/api/tatemoku', tatemokuRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subgroups', subgroupSchedulingRoutes);

// Google認証エンドポイント
app.get('/api/auth/google', (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    return res.json({ authUrl });
  } catch (error) {
    console.error('Google認証URL生成エラー:', error);
    return res.status(500).json({
      error: 'Google認証URLの生成に失敗しました',
      message: 'しばらく時間をおいて再度お試しください'
    });
  }
});

// Google認証コールバック (古いパス用の互換性)
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: '認証コードが無効です',
        message: '認証プロセスを最初からやり直してください'
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      throw new Error('ユーザー情報の取得に失敗しました');
    }

    // データベース接続
    const db = await import('./lib/database').then(m => m.getDatabase());

    // 既存ユーザーかチェック
    let existingUser = await db.get(`
      SELECT id, google_id, email, name, picture, role, is_super_admin, created_at
      FROM users
      WHERE email = ? OR google_id = ?
    `, [userInfo.data.email, userInfo.data.id]);

    let isNewUser = false;
    let user: any;

    if (!existingUser) {
      // 新規ユーザーの場合：DBに保存
      isNewUser = true;
      console.log(`新規ユーザー登録: ${userInfo.data.email}`);

      // デフォルトグループを取得（group_posse2を想定）
      const defaultGroup = await db.get(`
        SELECT id FROM groups WHERE id = 'group_posse2' OR name LIKE '%posse②%'
        ORDER BY created_at ASC LIMIT 1
      `);

      if (!defaultGroup) {
        throw new Error('デフォルトグループが見つかりません');
      }

      // ユーザーを登録
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.run(`
        INSERT INTO users (id, google_id, email, name, picture, role, is_super_admin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'member', 0, datetime('now'), datetime('now'))
      `, [
        userId,
        userInfo.data.id,
        userInfo.data.email,
        userInfo.data.name || '',
        userInfo.data.picture || null
      ]);

      // デフォルトグループに追加
      await db.run(`
        INSERT INTO group_members (id, group_id, user_id, role, joined_at, created_at, updated_at)
        VALUES (?, ?, ?, 'member', datetime('now'), datetime('now'), datetime('now'))
      `, [
        `gm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        defaultGroup.id,
        userId
      ]);

      user = {
        id: userId,
        google_id: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name || '',
        picture: userInfo.data.picture,
        role: 'member',
        is_super_admin: false
      };

      console.log(`✅ 新規ユーザー登録完了: ${user.email} (ID: ${user.id})`);
    } else {
      // 既存ユーザーの場合：情報を更新
      console.log(`既存ユーザーログイン: ${existingUser.email}`);

      // Googleから取得した最新の情報でユーザー情報を更新
      await db.run(`
        UPDATE users
        SET name = ?, picture = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [
        userInfo.data.name || existingUser.name,
        userInfo.data.picture || existingUser.picture,
        existingUser.id
      ]);

      user = {
        id: existingUser.id,
        google_id: existingUser.google_id,
        email: existingUser.email,
        name: userInfo.data.name || existingUser.name,
        picture: userInfo.data.picture || existingUser.picture,
        role: existingUser.role,
        is_super_admin: existingUser.is_super_admin
      };
    }

    const jwtToken = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    // フロントエンドにリダイレクト（初回ユーザーかどうかの情報も含める）
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectPath = isNewUser ? '/welcome' : '/dashboard';
    return res.redirect(`${frontendUrl}${redirectPath}?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify(user))}&newUser=${isNewUser}`);

  } catch (error) {
    console.error('Google認証コールバックエラー:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
});

// Google認証コールバック (APIエンドポイント)
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: '認証コードが無効です',
        message: '認証プロセスを最初からやり直してください'
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      throw new Error('ユーザー情報の取得に失敗しました');
    }

    const user = {
      id: userInfo.data.id!,
      email: userInfo.data.email,
      name: userInfo.data.name || '',
      picture: userInfo.data.picture
    };

    const jwtToken = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    return res.json({
      message: 'Google認証が完了しました',
      user,
      tokens: {
        accessToken: jwtToken,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Google認証コールバックエラー:', error);
    return res.status(500).json({
      error: 'Google認証に失敗しました',
      message: '認証プロセスを最初からやり直してください'
    });
  }
});

// 現在のユーザー情報取得エンドポイント（デバッグ用）
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    if (typeof decoded === 'object' && decoded.id) {
      const db = await import('./lib/database').then(m => m.getDatabase());
      const user = await db.get(`
        SELECT id, email, name, role, is_super_admin
        FROM users WHERE id = ?
      `, [decoded.id]);

      if (user) {
        return res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            is_super_admin: Boolean(user.is_super_admin)
          }
        });
      }
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (error) {
    console.error('Current user fetch error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// 開発用ログインエンドポイント（本番環境では無効化）
app.post('/api/auth/dev-login', async (req, res) => {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'メールアドレスが必要です',
        message: 'emailフィールドを指定してください'
      });
    }

    const db = await import('./lib/database').then(m => m.getDatabase());

    // データベースからユーザーを取得
    const user = await db.get(`
      SELECT id, google_id, email, name, picture, role, is_super_admin
      FROM users
      WHERE email = ?
    `, [email]);

    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません',
        message: `${email} は登録されていません`
      });
    }

    // JWTトークンを生成
    const jwtToken = generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    return res.json({
      message: '開発用ログインが完了しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        is_super_admin: user.is_super_admin
      },
      tokens: {
        accessToken: jwtToken,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('開発用ログインエラー:', error);
    return res.status(500).json({
      error: 'ログインに失敗しました',
      message: 'しばらく時間をおいて再度お試しください'
    });
  }
});

// 簡単なダッシュボード用データエンドポイント
app.get('/api/dashboard/data', async (req, res) => {
  try {
    const db = await import('./lib/database').then(m => m.getDatabase());

    // 基本統計を取得
    const users = await db.all('SELECT * FROM users LIMIT 10');
    const groups = await db.all('SELECT * FROM groups');
    const groupMembers = await db.all(`
      SELECT gm.*, u.name as user_name, u.email, g.name as group_name
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      JOIN groups g ON gm.group_id = g.id
    `);

    return res.json({
      users,
      groups,
      groupMembers,
      stats: {
        totalUsers: users.length,
        totalGroups: groups.length,
        totalMembers: groupMembers.length
      }
    });
  } catch (error) {
    console.error('ダッシュボードデータ取得エラー:', error);
    return res.status(500).json({
      error: 'データ取得に失敗しました',
      message: 'しばらく時間をおいて再度お試しください'
    });
  }
});

// 認証なしの管理者データエンドポイント（テスト用）
app.get('/api/admin/test-data', async (req, res) => {
  try {
    const db = await import('./lib/database').then(m => m.getDatabase());

    // グループとメンバーデータを取得
    const groups = await db.all(`
      SELECT g.*, u.name as created_by_name,
             COUNT(gm.id) as member_count
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id
    `);

    const members = await db.all(`
      SELECT u.id, u.name, u.email, u.role, u.is_super_admin,
             g.name as group_name, gm.role as member_role
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
    `);

    const subgroups = await db.all(`
      SELECT sg.*, g.name as group_name, u.name as admin_name,
             COUNT(sgm.id) as member_count
      FROM sub_groups sg
      LEFT JOIN groups g ON sg.group_id = g.id
      LEFT JOIN users u ON sg.admin_id = u.id
      LEFT JOIN sub_group_members sgm ON sg.id = sgm.subgroup_id
      GROUP BY sg.id
    `);

    return res.json({
      groups,
      members,
      subgroups,
      stats: {
        totalGroups: groups.length,
        totalMembers: members.length,
        totalSubgroups: subgroups.length
      }
    });
  } catch (error) {
    console.error('テストデータ取得エラー:', error);
    return res.status(500).json({
      error: 'データ取得に失敗しました',
      message: error instanceof Error ? error.message : '不明なエラーが発生しました'
    });
  }
});

app.get('/health', (req, res) => {
  return res.json({
    status: 'OK',
    message: '縦もく日程調整システム API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  return res.json({
    service: '縦もく日程調整システム',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      status: '/api/status',
      auth: '/api/auth/google',
      calendar: '/api/calendar'
    }
  });
});


app.use('*', (req, res) => {
  return res.status(404).json({
    error: 'Endpoint not found',
    message: 'リクエストされたエンドポイントが見つかりません',
    available_endpoints: [
      'GET /health',
      'GET /api/status',
      'GET /api/auth/google',
      'GET /api/auth/google/callback',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/calendar/calendars',
      'GET /api/calendar/events',
      'POST /api/calendar/availability'
    ]
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 縦もく日程調整システム API が http://localhost:${PORT} で起動しました`);
  console.log(`📖 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log('');

  // データベース初期化
  try {
    initializeDatabase();
    await testDatabaseConnection();
  } catch (error) {
    console.error('⚠️  データベース接続: 失敗');
    console.error('   データベースが起動していることを確認してください');
  }

  // Google設定チェック
  const hasValidConfig =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id.apps.googleusercontent.com';

  if (hasValidConfig) {
    console.log('✅ Google認証設定: 完了');
  } else {
    console.log('⚠️  Google認証設定: 未完了');
    console.log('   👉 GOOGLE_SETUP_GUIDE.md を参照して設定してください');
  }
});