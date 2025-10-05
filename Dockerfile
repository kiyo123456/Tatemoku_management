# Node.js LTSイメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY database/package*.json ./database/

# 依存関係をインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# TypeScriptのビルド
RUN npm run build:backend

# ポート番号を環境変数で指定（Railwayが自動設定）
EXPOSE $PORT

# アプリケーションを起動
CMD ["npm", "start"]