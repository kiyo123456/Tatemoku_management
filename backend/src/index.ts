import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(helmet({
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'サーバーは正常に動作しています',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'Configured' : 'Not Configured'
  });
});

// API基本情報
app.get('/api', (req, res) => {
  res.json({
    name: '縦もく日程調整システム API',
    version: '1.0.0',
    status: 'ローカル開発モード',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      groups: '/api/groups'
    }
  });
});

// 認証エンドポイント（仮実装）
app.get('/api/auth/me', (req, res) => {
  res.json({
    message: 'Auth endpoint - 実装予定',
    user: null,
    authenticated: false
  });
});

// ユーザーエンドポイント（仮実装）
app.get('/api/users', (req, res) => {
  res.json({
    message: 'Users endpoint - 実装予定',
    users: []
  });
});

// グループエンドポイント（仮実装）
app.get('/api/groups', (req, res) => {
  res.json({
    message: 'Groups endpoint - 実装予定',
    groups: []
  });
});

// 404 ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません',
    message: `${req.method} ${req.originalUrl} は存在しません`,
    availableEndpoints: ['/health', '/api', '/api/auth/me', '/api/users', '/api/groups']
  });
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('エラーが発生しました:', err);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : '内部サーバーエラー'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`✅ 縦もく日程調整システム バックエンドAPI サーバーが起動しました`);
  console.log(`🌐 サーバーURL: http://localhost:${PORT}`);
  console.log(`🔗 ヘルスチェック: http://localhost:${PORT}/health`);
  console.log(`📱 API情報: http://localhost:${PORT}/api`);
  console.log(`🔧 開発モード: ${process.env.NODE_ENV || 'development'}`);

  if (!process.env.DATABASE_URL) {
    console.log(`⚠️ データベース接続は設定されていません（動作確認モード）`);
  }
});

export default app;