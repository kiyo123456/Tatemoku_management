import { Pool } from 'pg';

// SQLiteからPostgreSQLへの移行用ヘルパー関数

export class DbHelper {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * SQLiteのdb.get()に相当する関数
   * 単一の行を取得
   */
  async get(query: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      // SQLiteのプレースホルダー(?)をPostgreSQLのプレースホルダー($1, $2...)に変換
      const pgQuery = this.convertPlaceholders(query);
      const result = await client.query(pgQuery, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * SQLiteのdb.all()に相当する関数
   * 複数の行を取得
   */
  async all(query: string, params: any[] = []): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const pgQuery = this.convertPlaceholders(query);
      const result = await client.query(pgQuery, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * SQLiteのdb.run()に相当する関数
   * INSERT, UPDATE, DELETE
   */
  async run(query: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const pgQuery = this.convertPlaceholders(query);
      const result = await client.query(pgQuery, params);
      return {
        changes: result.rowCount || 0,
        lastID: result.rows[0]?.id || null
      };
    } finally {
      client.release();
    }
  }

  /**
   * SQLiteのdb.exec()に相当する関数
   * 複数のSQL文を実行
   */
  async exec(sql: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  }

  /**
   * SQLiteのプレースホルダー(?)をPostgreSQLの($1, $2...)に変換
   */
  private convertPlaceholders(query: string): string {
    let counter = 1;
    return query.replace(/\?/g, () => `$${counter++}`);
  }

  /**
   * トランザクション実行
   */
  async transaction<T>(callback: (helper: DbHelper) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 専用のDbHelperインスタンスを作成（同じクライアント接続を使用）
      const transactionHelper = new TransactionDbHelper(client);

      const result = await callback(transactionHelper);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * トランザクション用のDbHelper
 * 既存のクライアント接続を再利用
 */
class TransactionDbHelper extends DbHelper {
  private client: any;

  constructor(client: any) {
    super(null as any); // プールは使わない
    this.client = client;
  }

  async get(query: string, params: any[] = []): Promise<any> {
    const pgQuery = this.convertPlaceholders(query);
    const result = await this.client.query(pgQuery, params);
    return result.rows[0] || null;
  }

  async all(query: string, params: any[] = []): Promise<any[]> {
    const pgQuery = this.convertPlaceholders(query);
    const result = await this.client.query(pgQuery, params);
    return result.rows;
  }

  async run(query: string, params: any[] = []): Promise<any> {
    const pgQuery = this.convertPlaceholders(query);
    const result = await this.client.query(pgQuery, params);
    return {
      changes: result.rowCount || 0,
      lastID: result.rows[0]?.id || null
    };
  }

  async exec(sql: string): Promise<void> {
    await this.client.query(sql);
  }

  private convertPlaceholders(query: string): string {
    let counter = 1;
    return query.replace(/\?/g, () => `$${counter++}`);
  }
}