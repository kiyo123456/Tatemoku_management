"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUser = exports.validateEmail = exports.generateAccessToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../lib/database");
const authenticateToken = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const db = (0, database_1.getDatabase)();
        const user = await db.get('SELECT id, email, name, role, is_super_admin FROM users WHERE id = ?', [decoded.id]);
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
    }
    catch (err) {
        res.status(403).json({
            error: 'トークンが無効です',
            message: '再度ログインしてください'
        });
        return;
    }
};
exports.authenticateToken = authenticateToken;
const generateAccessToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRETが設定されていません');
    }
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        name: user.name
    }, secret, { expiresIn: '24h' });
};
exports.generateAccessToken = generateAccessToken;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const sanitizeUser = (user) => {
    const { accessToken, refreshToken, ...sanitized } = user;
    return sanitized;
};
exports.sanitizeUser = sanitizeUser;
//# sourceMappingURL=auth.js.map