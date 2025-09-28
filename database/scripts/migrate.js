const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
  const dbPath = path.join(__dirname, '..', '..', 'database', 'time_manage.db');

  // データベースディレクトリが存在しない場合は作成
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let db;

  try {
    console.log('🔗 SQLiteデータベースに接続中...');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // 外部キー制約を有効化
    await db.exec('PRAGMA foreign_keys = ON');

    console.log('📝 スキーマファイルを読み込み中...');
    const schemaPath = path.join(__dirname, '..', 'init.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 データベースマイグレーションを実行中...');
    await db.exec(schema);

    console.log('✅ データベースマイグレーションが完了しました！');
    console.log('📊 以下のテーブルが作成されました:');
    console.log('   - users (ユーザー)');
    console.log('   - groups (グループ)');
    console.log('   - group_members (グループメンバー)');
    console.log('   - scheduling_sessions (日程調整セッション)');
    console.log('   - time_slots (時間スロット)');
    console.log('   - slot_availability (参加可能性)');
    console.log('   - confirmed_events (確定済みイベント)');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;