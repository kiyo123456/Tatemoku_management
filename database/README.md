# データベース設定

## セットアップ手順

### 1. PostgreSQLのインストール

```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Windows
# PostgreSQLの公式サイトからインストーラーをダウンロード
```

### 2. データベースの作成

```bash
# PostgreSQLに接続
psql postgres

# データベースを作成
CREATE DATABASE time_manage;

# ユーザーを作成（オプション）
CREATE USER time_manage_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE time_manage TO time_manage_user;

# 接続を終了
\q
```

### 3. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して、データベース接続情報を設定
```

### 4. マイグレーションの実行

```bash
npm install
npm run migrate
```

## 利用可能なスクリプト

- `npm run migrate` - データベーススキーマを作成
- `npm run seed` - サンプルデータを挿入
- `npm run reset` - データベースをリセット
- `npm run setup` - migrate + seed を実行

## データベーススキーマ

### テーブル構成

1. **users** - ユーザー情報
2. **groups** - グループ情報
3. **group_members** - グループメンバー関係
4. **scheduling_sessions** - 日程調整セッション
5. **time_slots** - 提案された時間スロット
6. **slot_availability** - 各スロットへの参加可能性
7. **confirmed_events** - 確定済みイベント

### 主要な関係

- ユーザーは複数のグループに所属可能
- グループは複数の日程調整セッションを持つ
- セッションは複数の時間スロット候補を持つ
- 各スロットに対してユーザーの参加可能性を記録