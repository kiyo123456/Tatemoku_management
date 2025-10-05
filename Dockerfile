# Node.js LTSイメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY database/package*.json ./database/

# 依存関係をインストール（ビルド用にdevDependenciesも含める）
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptのビルド
RUN npm run build:backend

# 本番用依存関係のみを再インストール（イメージサイズ削減）
RUN npm ci --only=production && npm cache clean --force

# ポート番号を環境変数で指定（Railwayが自動設定）
EXPOSE $PORT

# アプリケーションを起動
CMD ["npm", "start"]