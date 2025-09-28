# Google Cloud Console 設定ガイド

## 📋 設定チェックリスト

- [ ] Google Cloud Consoleプロジェクト作成
- [ ] Google Calendar API有効化
- [ ] Google People API有効化
- [ ] OAuth同意画面設定
- [ ] OAuth 2.0クライアントID作成
- [ ] リダイレクトURI設定
- [ ] 環境変数ファイル更新

## 🔧 詳細設定手順

### 1. Google Cloud Consoleにアクセス
```
https://console.cloud.google.com/
```

### 2. プロジェクト作成
- プロジェクト名: `time-manage-system`
- 組織: なし（個人アカウントの場合）

### 3. APIの有効化
以下のAPIを有効化してください：
- **Google Calendar API**
- **Google People API**

### 4. OAuth同意画面の設定

#### 基本情報
```
アプリ名: 縦もく日程調整システム
ユーザーサポートメール: あなたのメールアドレス
アプリのドメイン: http://localhost:3000
デベロッパーの連絡先情報: あなたのメールアドレス
```

#### スコープ設定
以下のスコープを追加してください：
```
../auth/calendar.readonly      # カレンダー読み取り
../auth/calendar.freebusy     # 空き時間情報取得
../auth/userinfo.email        # ユーザーメール取得
../auth/userinfo.profile      # ユーザープロフィール取得
```

### 5. OAuth 2.0クライアントID作成

#### 設定値
```
アプリケーションの種類: ウェブアプリケーション
名前: time-manage-web-client

承認済みのJavaScript生成元:
- http://localhost:3000

承認済みのリダイレクトURI:
- http://localhost:3001/auth/google/callback
```

### 6. 環境変数の設定

#### バックエンド (.env)
```bash
# backend/.env ファイルを編集
GOOGLE_CLIENT_ID=取得したクライアントID
GOOGLE_CLIENT_SECRET=取得したクライアントシークレット
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```

#### フロントエンド (.env.local)
```bash
# frontend/.env.local ファイルを編集
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🔍 取得する認証情報

Google Cloud Consoleで以下の情報をコピーしてください：

### クライアントID
```
形式: 123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
場所: OAuth 2.0クライアントID作成後に表示
```

### クライアントシークレット
```
形式: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
場所: OAuth 2.0クライアントID作成後に表示
注意: 安全に保管し、公開リポジトリにコミットしないでください
```

## ⚠️ 重要な注意事項

### セキュリティ
- **クライアントシークレットは絶対に公開しない**
- `.env`ファイルを`.gitignore`に追加
- 本番環境では環境変数から設定

### テストユーザー追加
OAuth同意画面がテストモードの場合：
1. 「テストユーザー」セクションで「+ ADD USERS」
2. 縦もくメンバーのGoogleアカウントを追加
3. 追加されたユーザーのみがログイン可能

### 本番公開時
1. OAuth同意画面を「本番」に変更
2. Googleの審査プロセスが必要
3. プライバシーポリシーとサービス利用規約が必要

## 🧪 テスト方法

設定完了後、以下でテストできます：

```bash
# バックエンド起動
cd backend
npm run dev

# フロントエンド起動（別ターミナル）
cd frontend
npm run dev
```

1. http://localhost:3000 にアクセス
2. 「Googleアカウントでログイン」をクリック
3. Google認証画面が表示されることを確認
4. 認証完了後、ダッシュボードにリダイレクトされることを確認

## ❌ よくあるエラーと解決方法

### Error 400: redirect_uri_mismatch
- リダイレクトURIが正確に設定されているか確認
- `http://localhost:3001/auth/google/callback` (末尾スラッシュなし)

### Error 403: access_denied
- OAuth同意画面でテストユーザーに追加されているか確認
- スコープが正しく設定されているか確認

### API無効エラー
- Google Calendar APIとGoogle People APIが有効になっているか確認