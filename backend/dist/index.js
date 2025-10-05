"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const googleapis_1 = require("googleapis");
const auth_1 = require("./middleware/auth");
const database_1 = require("./lib/database");
const tatemoku_1 = __importDefault(require("./routes/tatemoku"));
const admin_1 = __importDefault(require("./routes/admin"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const subgroup_scheduling_1 = __importDefault(require("./routes/subgroup-scheduling"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/tatemoku', tatemoku_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/subgroups', subgroup_scheduling_1.default);
app.get('/api/auth/google', (req, res) => {
    try {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
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
    }
    catch (error) {
        console.error('Google認証URL生成エラー:', error);
        return res.status(500).json({
            error: 'Google認証URLの生成に失敗しました',
            message: 'しばらく時間をおいて再度お試しください'
        });
    }
});
app.get('/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                error: '認証コードが無効です',
                message: '認証プロセスを最初からやり直してください'
            });
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (!userInfo.data.email) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }
        const pool = await Promise.resolve().then(() => __importStar(require('./lib/database'))).then(m => m.getDatabase());
        const client = await pool.connect();
        try {
            const existingUserQuery = await client.query(`
        SELECT id, google_id, email, name, picture, role, is_super_admin, created_at
        FROM users
        WHERE email = $1 OR google_id = $2
      `, [userInfo.data.email, userInfo.data.id]);
            let existingUser = existingUserQuery.rows[0] || null;
            let isNewUser = false;
            let user;
            if (!existingUser) {
                isNewUser = true;
                console.log(`新規ユーザー登録: ${userInfo.data.email}`);
                const defaultGroup = await db.get(`
        SELECT id FROM groups WHERE id = 'group_posse2' OR name LIKE '%posse②%'
        ORDER BY created_at ASC LIMIT 1
      `);
                if (!defaultGroup) {
                    throw new Error('デフォルトグループが見つかりません');
                }
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
            }
            else {
                console.log(`既存ユーザーログイン: ${existingUser.email}`);
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
            const jwtToken = (0, auth_1.generateAccessToken)({
                id: user.id,
                email: user.email,
                name: user.name
            });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectPath = isNewUser ? '/welcome' : '/dashboard';
            return res.redirect(`${frontendUrl}${redirectPath}?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify(user))}&newUser=${isNewUser}`);
        }
        catch (error) {
            console.error('Google認証コールバックエラー:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }
    }
    finally { }
});
app.get('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                error: '認証コードが無効です',
                message: '認証プロセスを最初からやり直してください'
            });
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (!userInfo.data.email) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }
        const user = {
            id: userInfo.data.id,
            email: userInfo.data.email,
            name: userInfo.data.name || '',
            picture: userInfo.data.picture
        };
        const jwtToken = (0, auth_1.generateAccessToken)({
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
    }
    catch (error) {
        console.error('Google認証コールバックエラー:', error);
        return res.status(500).json({
            error: 'Google認証に失敗しました',
            message: '認証プロセスを最初からやり直してください'
        });
    }
});
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
        const jwt = await Promise.resolve().then(() => __importStar(require('jsonwebtoken')));
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        if (typeof decoded === 'object' && decoded.id) {
            const db = await Promise.resolve().then(() => __importStar(require('./lib/database'))).then(m => m.getDatabase());
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
    }
    catch (error) {
        console.error('Current user fetch error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});
app.post('/api/auth/dev-login', async (req, res) => {
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
        const db = await Promise.resolve().then(() => __importStar(require('./lib/database'))).then(m => m.getDatabase());
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
        const jwtToken = (0, auth_1.generateAccessToken)({
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
    }
    catch (error) {
        console.error('開発用ログインエラー:', error);
        return res.status(500).json({
            error: 'ログインに失敗しました',
            message: 'しばらく時間をおいて再度お試しください'
        });
    }
});
app.get('/api/dashboard/data', async (req, res) => {
    try {
        const db = await Promise.resolve().then(() => __importStar(require('./lib/database'))).then(m => m.getDatabase());
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
    }
    catch (error) {
        console.error('ダッシュボードデータ取得エラー:', error);
        return res.status(500).json({
            error: 'データ取得に失敗しました',
            message: 'しばらく時間をおいて再度お試しください'
        });
    }
});
app.get('/api/admin/test-data', async (req, res) => {
    try {
        const db = await Promise.resolve().then(() => __importStar(require('./lib/database'))).then(m => m.getDatabase());
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
    }
    catch (error) {
        console.error('テストデータ取得エラー:', error);
        return res.status(500).json({
            error: 'データ取得に失敗しました',
            message: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
app.get('/health', async (req, res) => {
    const health = {
        status: 'OK',
        message: '縦もく日程調整システム API',
        timestamp: new Date().toISOString(),
        database: 'unknown',
        environment: process.env.NODE_ENV || 'development'
    };
    try {
        const dbOk = await (0, database_1.testDatabaseConnection)();
        health.database = dbOk ? 'connected' : 'disconnected';
    }
    catch (error) {
        health.database = 'error';
    }
    return res.json(health);
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
    try {
        await (0, database_1.initializeDatabase)();
        const connectionOk = await (0, database_1.testDatabaseConnection)();
        if (connectionOk) {
            console.log('✅ データベース接続: 完了');
        }
        else {
            console.warn('⚠️  データベース接続: 失敗 - アプリは起動しますがDB機能は利用できません');
        }
    }
    catch (error) {
        console.error('❌ データベース初期化エラー:', error);
        console.warn('⚠️  データベースなしでアプリを起動します');
    }
    const hasValidConfig = process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id.apps.googleusercontent.com';
    if (hasValidConfig) {
        console.log('✅ Google認証設定: 完了');
    }
    else {
        console.log('⚠️  Google認証設定: 未完了');
        console.log('   👉 GOOGLE_SETUP_GUIDE.md を参照して設定してください');
    }
});
//# sourceMappingURL=index.js.map