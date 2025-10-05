"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.getDatabaseHelper = getDatabaseHelper;
exports.closeDatabase = closeDatabase;
exports.testDatabaseConnection = testDatabaseConnection;
const pg_1 = require("pg");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_helpers_1 = require("./db-helpers");
let pool = null;
let dbHelper = null;
async function initializeDatabase() {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            console.warn('⚠️ DATABASE_URL環境変数が設定されていません - 開発モードで継続');
            if (process.env.NODE_ENV === 'production') {
                throw new Error('DATABASE_URL環境変数が設定されていません');
            }
            return null;
        }
        pool = new pg_1.Pool({
            connectionString: databaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        console.log('✅ PostgreSQL データベース接続プール作成完了');
        dbHelper = new db_helpers_1.DbHelper(pool);
        const initSqlPath = path_1.default.join(process.cwd(), 'database', 'init.sql');
        if (fs_1.default.existsSync(initSqlPath)) {
            const client = await pool.connect();
            try {
                const initSql = fs_1.default.readFileSync(initSqlPath, 'utf8');
                await client.query(initSql);
                console.log('✅ データベース初期化完了');
            }
            finally {
                client.release();
            }
        }
    }
    return pool;
}
function getDatabase() {
    if (!pool) {
        throw new Error('データベースが初期化されていません。initializeDatabase() を最初に呼び出してください。');
    }
    return pool;
}
function getDatabaseHelper() {
    if (!dbHelper) {
        throw new Error('データベースが初期化されていません。initializeDatabase() を最初に呼び出してください。');
    }
    return dbHelper;
}
async function closeDatabase() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
async function testDatabaseConnection() {
    try {
        const poolResult = await initializeDatabase();
        if (!poolResult || !pool) {
            console.warn('⚠️ データベースプールが初期化されていません');
            return false;
        }
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT NOW() as current_time');
            console.log('✅ データベース接続テスト成功:', result.rows[0]?.current_time);
            return true;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ データベース接続テスト失敗:', error);
        console.error('   エラー詳細:', error instanceof Error ? error.message : String(error));
        return false;
    }
}
//# sourceMappingURL=database.js.map