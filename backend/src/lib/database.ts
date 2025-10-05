import { Pool, PoolClient } from 'pg';
import path from 'path';
import fs from 'fs';
import { DbHelper } from './db-helpers';

let pool: Pool | null = null;
let dbHelper: DbHelper | null = null;

export async function initializeDatabase() {
  if (!pool) {
    // 環境変数からデータベースURLを取得（RailwayのDATABASE_URL）
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL環境変数が設定されていません');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('✅ PostgreSQL データベース接続成功');

    // DbHelperインスタンスを作成
    dbHelper = new DbHelper(pool);

    // 初期化スクリプトを実行
    const initSqlPath = path.join(process.cwd(), 'database', 'init.sql');
    if (fs.existsSync(initSqlPath)) {
      const client = await pool.connect();
      try {
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        await client.query(initSql);
        console.log('✅ データベース初期化完了');
      } finally {
        client.release();
      }
    }
  }
  return pool;
}

export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('データベースが初期化されていません。initializeDatabase() を最初に呼び出してください。');
  }
  return pool;
}

// SQLite互換のAPIを提供
export function getDatabaseHelper(): DbHelper {
  if (!dbHelper) {
    throw new Error('データベースが初期化されていません。initializeDatabase() を最初に呼び出してください。');
  }
  return dbHelper;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// データベース接続テスト
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await initializeDatabase();
    const database = getDatabase();
    const client = await database.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time');
      console.log('✅ データベース接続成功:', result.rows[0]?.current_time);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ データベース接続失敗:', error);
    return false;
  }
}