const jwt = require('jsonwebtoken');

// テスト用のユーザー情報
const testUser = {
  id: 'admin1',
  email: 'admin@example.com',
  name: '管理者'
};

// JWT_SECRETが設定されていない場合はデフォルト値を使用
const secret = process.env.JWT_SECRET || 'default_secret_for_development';

// トークンを生成
const token = jwt.sign(testUser, secret, { expiresIn: '24h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nCurl example:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/tatemoku/sessions`);