# 縦もく日程調整自動化システム

## プロジェクト概要

縦もくの日程調整を自動化し、調整担当者の負担を軽減するシステムです。
Googleカレンダーと連携して、メンバーの空き時間を自動取得・分析し、最適な縦もく開催候補日時を提示します。

## システム構成

```
time_manage/
├── frontend/          # フロントエンド（Next.js）
├── backend/           # バックエンド（Node.js/Express）
├── database/          # データベース設定・マイグレーション
├── docs/             # ドキュメント
└── README.md
```

## 技術スタック

### フロントエンド
- Next.js (React)
- TypeScript
- Tailwind CSS
- WebSocket (リアルタイム更新)

### バックエンド
- Node.js
- Express.js
- TypeScript
- Google Calendar API
- Google OAuth 2.0

### データベース
- PostgreSQL

## 主要機能

1. **カレンダー連携機能**: GoogleカレンダーのOAuth認証・空き時間取得
2. **空き時間分析機能**: 全メンバーの共通空き時間を特定
3. **日程候補提示機能**: 最適な縦もく開催候補日時を提示

## 開発環境のセットアップ

### 前提条件
- Node.js 18.x以上
- PostgreSQL 14.x以上
- Google Cloud Console アカウント

### セットアップ手順

1. **依存関係のインストール**
```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install
```

2. **環境変数の設定**
```bash
# backend/.env
DATABASE_URL=postgresql://username:password@localhost:5432/time_manage
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
```

3. **データベースの初期化**
```bash
cd database
npm run migrate
```

4. **開発サーバーの起動**
```bash
# バックエンド
cd backend
npm run dev

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

## アプリケーションの使い方

### 🚀 クイックスタート

1. **サーバーの起動**
```bash
npm run dev
```
- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:3001

2. **初回ログイン**
- http://localhost:3000 にアクセス
- 「Googleアカウントで始める」をクリック
- 開発環境では「開発用ログイン」も利用可能

### 📱 主要機能の使い方

#### 1. ダッシュボード (`/dashboard`)
- **概要**: 全体的な状況確認とクイックアクション
- **機能**:
  - 通知一覧の確認
  - 次回縦もくの予定確認
  - 各機能への導線

#### 2. 縦もく管理 (`/tatemoku`)
- **概要**: 縦もくグループの作成・管理
- **操作手順**:
  1. 「新しいグループを作成」をクリック
  2. グループ名を入力
  3. メンバーをドラッグ&ドロップで追加
  4. 変更履歴で過去の調整を確認

#### 3. 日程調整 (`/scheduling`)
- **新規日程調整** (`/scheduling/new`):
  1. 調整名称を入力
  2. 候補日時を複数選択
  3. 対象メンバーを選択
  4. 調整を開始
- **サブグループ調整** (`/scheduling/subgroup`):
  - 利用可能なサブグループから選択
  - 個別グループ単位での日程調整

#### 4. カレンダー連携 (`/calendar`)
- **Google Calendar連携**:
  1. 「Googleカレンダーと連携」をクリック
  2. OAuth認証を完了
  3. 空き時間の自動取得開始

#### 5. 管理者機能 (`/admin`)
- **スーパーアドミン専用**
- **機能**:
  - 全ユーザーの管理
  - システム設定
  - 使用状況分析

### 🔐 認証について

#### 本番環境（Google OAuth）
1. Google Cloud Console でOAuth設定が必要
2. `backend/.env` に認証情報を設定
3. ユーザーはGoogleアカウントでログイン

#### 開発環境（開発用ログイン）
- メールアドレスのみでログイン可能
- テスト用の簡易認証システム
- 本番環境では無効化される

### 🗄️ データベース

#### 現在の構成
- **SQLite** (開発環境)
- ファイル場所: `backend/database/time_manage.db`

#### PostgreSQL移行時
```bash
# 環境変数を更新
DATABASE_URL=postgresql://username:password@localhost:5432/time_manage

# マイグレーション実行
cd database
npm run migrate
```

### 🔧 トラブルシューティング

#### よくある問題

1. **CORS エラー**
   - `backend/.env` の `FRONTEND_URL` を確認
   - フロントエンドのポート番号と一致させる

2. **API接続エラー**
   - バックエンドサーバーが起動しているか確認
   - `http://localhost:3001/health` でヘルスチェック

3. **Google認証エラー**
   - OAuth設定を確認
   - リダイレクトURIが正しく設定されているか確認

4. **データベース接続エラー**
   - SQLiteファイルの権限を確認
   - PostgreSQL使用時は接続文字列を確認

### 📊 開発時のヒント

- **リアルタイム更新**: WebSocketでライブ更新
- **レスポンシブ対応**: モバイル・デスクトップ両対応
- **TypeScript**: 型安全な開発環境
- **エラーハンドリング**: 各種エラー状況に対応

### 🎯 使用シーン例

1. **週次縦もく調整**
   - 前週末に翌週の候補日を設定
   - メンバーの空き時間を自動取得
   - 最適な日時を提案・決定

2. **緊急調整**
   - 急遽開催が必要な場合
   - リアルタイムでの空き時間確認
   - 即座に候補日を提示

3. **長期計画**
   - 月間・四半期単位での計画
   - 定期的な縦もく枠の確保
   - 参加率の向上

## 目標

- 全グループで月2回以上の縦もく開催
- 各回の参加率70%以上
- 日程調整時間を80%削減（15分以内）
- システム利用率90%以上