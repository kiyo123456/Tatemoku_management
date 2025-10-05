"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    }
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'サーバーは正常に動作しています',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: process.env.DATABASE_URL ? 'Configured' : 'Not Configured'
    });
});
app.get('/api', (req, res) => {
    res.json({
        name: '縦もく日程調整システム API',
        version: '1.0.0',
        status: 'ローカル開発モード',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/users',
            groups: '/api/groups'
        }
    });
});
app.get('/api/auth/me', (req, res) => {
    res.json({
        message: 'Auth endpoint - 実装予定',
        user: null,
        authenticated: false
    });
});
app.get('/api/users', (req, res) => {
    res.json({
        message: 'Users endpoint - 実装予定',
        users: []
    });
});
app.get('/api/groups', (req, res) => {
    res.json({
        message: 'Groups endpoint - 実装予定',
        groups: []
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'エンドポイントが見つかりません',
        message: `${req.method} ${req.originalUrl} は存在しません`,
        availableEndpoints: ['/health', '/api', '/api/auth/me', '/api/users', '/api/groups']
    });
});
app.use((err, req, res, next) => {
    console.error('エラーが発生しました:', err);
    res.status(500).json({
        error: 'サーバーエラーが発生しました',
        message: process.env.NODE_ENV === 'development' ? err.message : '内部サーバーエラー'
    });
});
app.listen(PORT, () => {
    console.log(`✅ 縦もく日程調整システム バックエンドAPI サーバーが起動しました`);
    console.log(`🌐 サーバーURL: http://localhost:${PORT}`);
    console.log(`🔗 ヘルスチェック: http://localhost:${PORT}/health`);
    console.log(`📱 API情報: http://localhost:${PORT}/api`);
    console.log(`🔧 開発モード: ${process.env.NODE_ENV || 'development'}`);
    if (!process.env.DATABASE_URL) {
        console.log(`⚠️ データベース接続は設定されていません（動作確認モード）`);
    }
});
exports.default = app;
//# sourceMappingURL=index.js.map