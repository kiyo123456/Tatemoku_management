import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

export async function initializeDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'database', 'time_manage.db');

    // データベースディレクトリが存在しない場合は作成
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // 外部キー制約を有効化
    await db.exec('PRAGMA foreign_keys = ON');

    console.log('✅ SQLite データベース接続成功:', dbPath);

    // 初期化スクリプトを実行
    const initSqlPath = path.join(process.cwd(), 'database', 'init.sql');
    if (fs.existsSync(initSqlPath)) {
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      await db.exec(initSql);
      console.log('✅ データベース初期化完了');
    }
  }
  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('データベースが初期化されていません。initializeDatabase() を最初に呼び出してください。');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

// データベース接続テスト
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await initializeDatabase();
    const database = getDatabase();
    const result = await database.get('SELECT datetime("now") as current_time');
    console.log('✅ データベース接続成功:', result?.current_time);
    return true;
  } catch (error) {
    console.error('❌ データベース接続失敗:', error);
    return false;
  }
}