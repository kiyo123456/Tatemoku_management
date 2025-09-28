"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleapis_1 = require("googleapis");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/google', (req, res) => {
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
router.get('/google/callback', async (req, res) => {
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
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                error: 'リフレッシュトークンが必要です'
            });
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { credentials } = await oauth2Client.refreshAccessToken();
        return res.json({
            message: 'トークンのリフレッシュが完了しました',
            tokens: {
                accessToken: credentials.access_token,
                expiryDate: credentials.expiry_date
            }
        });
    }
    catch (error) {
        console.error('トークンリフレッシュエラー:', error);
        return res.status(500).json({
            error: 'トークンのリフレッシュに失敗しました'
        });
    }
});
router.get('/me', auth_1.authenticateToken, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'ユーザー情報が見つかりません'
            });
        }
        return res.json({
            user: req.user,
            message: 'ユーザー情報の取得が完了しました'
        });
    }
    catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        return res.status(500).json({
            error: 'ユーザー情報の取得に失敗しました'
        });
    }
});
router.post('/logout', auth_1.authenticateToken, (req, res) => {
    try {
        return res.json({
            message: 'ログアウトが完了しました',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('ログアウトエラー:', error);
        return res.status(500).json({
            error: 'ログアウト処理に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map