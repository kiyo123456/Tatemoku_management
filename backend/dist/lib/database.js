"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.testDatabaseConnection = testDatabaseConnection;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db = null;
async function initializeDatabase() {
    if (!db) {
        const dbPath = path_1.default.join(process.cwd(), 'database', 'time_manage.db');
        const dbDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        db = await (0, sqlite_1.open)({
            filename: dbPath,
            driver: sqlite3_1.default.Database
        });
        await db.exec('PRAGMA foreign_keys = ON');
        console.log('✅ SQLite データベース接続成功:', dbPath);
        const initSqlPath = path_1.default.join(process.cwd(), 'database', 'init.sql');
        if (fs_1.default.existsSync(initSqlPath)) {
            const initSql = fs_1.default.readFileSync(initSqlPath, 'utf8');
            await db.exec(initSql);
            console.log('✅ データベース初期化完了');
        }
    }
    return db;
}
function getDatabase() {
    if (!db) {
        throw new Error('データベースが初期化されていません。initializeDatabase() を最初に呼び出してください。');
    }
    return db;
}
async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}
async function testDatabaseConnection() {
    try {
        await initializeDatabase();
        const database = getDatabase();
        const result = await database.get('SELECT datetime("now") as current_time');
        console.log('✅ データベース接続成功:', result?.current_time);
        return true;
    }
    catch (error) {
        console.error('❌ データベース接続失敗:', error);
        return false;
    }
}
//# sourceMappingURL=database.js.map