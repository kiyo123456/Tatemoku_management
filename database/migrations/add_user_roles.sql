-- 管理者権限レベル追加マイグレーション
-- 実行日: 2024-09-18

-- usersテーブルに権限フィールドを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member',
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- roleフィールドのコメント
COMMENT ON COLUMN users.role IS 'ユーザーの権限レベル: super_admin(posse②代表), admin(グループ管理者), member(一般メンバー)';
COMMENT ON COLUMN users.is_super_admin IS 'posse②代表フラグ - メンバー移動権限を持つ';

-- roleのチェック制約を追加
ALTER TABLE users
ADD CONSTRAINT check_user_role
CHECK (role IN ('super_admin', 'admin', 'member'));

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin);

-- スーパー管理者設定用のサンプルSQL（実際のメールアドレスに置き換えて実行）
-- UPDATE users SET role = 'super_admin', is_super_admin = TRUE
-- WHERE email = 'posse-representative@example.com';