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
      console.warn('⚠️ DATABASE_URL環境変数が設定されていません - 開発モードで継続');
      // 開発環境では警告のみで続行
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL環境変数が設定されていません');
      }
      return null;
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // 接続プールの設定を追加
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    console.log('✅ PostgreSQL データベース接続プール作成完了');

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
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ データベース接続テスト失敗:', error);
    console.error('   エラー詳細:', error instanceof Error ? error.message : String(error));
    return false;
  }
}