-- データベース初期化とダミーデータ

-- 基本テーブル作成（既に存在する場合はスキップ）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  is_super_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS sub_groups (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  admin_id TEXT REFERENCES users(id),
  max_members INTEGER DEFAULT 6,
  color TEXT DEFAULT '#3B82F6',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sub_group_members (
  id TEXT PRIMARY KEY,
  subgroup_id TEXT REFERENCES sub_groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(subgroup_id, user_id)
);

-- ダミーユーザーの挿入（開発用ログインで使用）
INSERT OR IGNORE INTO users (id, email, name, role, is_super_admin) VALUES
-- posse②のスーパー管理者
('user_posse2_super', 'posse2-super@example.com', 'posse②代表', 'admin', 1),
-- 通常のメンバー
('user_1728233824567_abc123', 'user1@example.com', '田中太郎', 'member', 0),
('user_1728233825678_def456', 'user2@example.com', '佐藤花子', 'member', 0),
('user_1728233826789_ghi789', 'user3@example.com', '山田次郎', 'admin', 0),
('user_1728233827890_jkl012', 'user4@example.com', '鈴木美咲', 'member', 0),
('user_1728233828901_mno345', 'user5@example.com', '高橋健一', 'member', 0);

-- デフォルトグループの作成
INSERT OR IGNORE INTO groups (id, name, description, created_by) VALUES
('group_posse2', 'posse②', 'posse②グループ', 'user_posse2_super');

-- グループメンバーの追加
INSERT OR IGNORE INTO group_members (id, group_id, user_id, role) VALUES
-- posse② (スーパー管理者: posse②代表のみ)
('gm_posse2_001', 'group_posse2', 'user_posse2_super', 'admin'),
('gm_posse2_002', 'group_posse2', 'user_1728233824567_abc123', 'member'),
('gm_posse2_003', 'group_posse2', 'user_1728233825678_def456', 'member'),
('gm_posse2_004', 'group_posse2', 'user_1728233826789_ghi789', 'admin'),
('gm_posse2_005', 'group_posse2', 'user_1728233827890_jkl012', 'member'),
('gm_posse2_006', 'group_posse2', 'user_1728233828901_mno345', 'member');

-- サンプルサブグループの作成
INSERT OR IGNORE INTO sub_groups (id, group_id, name, description, admin_id, color) VALUES
('subgroup_posse2_alpha', 'group_posse2', 'Alpha Team', 'posse②のAlphaチーム', 'user_1728233824567_abc123', '#3B82F6'),
('subgroup_posse2_beta', 'group_posse2', 'Beta Team', 'posse②のBetaチーム', 'user_1728233825678_def456', '#10B981'),
('subgroup_posse2_gamma', 'group_posse2', 'Gamma Team', 'posse②のGammaチーム', 'user_1728233826789_ghi789', '#F59E0B');

-- サブグループメンバーの追加
INSERT OR IGNORE INTO sub_group_members (id, subgroup_id, user_id) VALUES
-- Alpha Team (posse②)
('sgm_posse2_alpha_001', 'subgroup_posse2_alpha', 'user_1728233824567_abc123'),

-- Beta Team (posse②)
('sgm_posse2_beta_001', 'subgroup_posse2_beta', 'user_1728233825678_def456'),

-- Gamma Team (posse②)
('sgm_posse2_gamma_001', 'subgroup_posse2_gamma', 'user_1728233826789_ghi789'),
('sgm_posse2_gamma_002', 'subgroup_posse2_gamma', 'user_1728233827890_jkl012');

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_subgroup_id ON sub_group_members(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_user_id ON sub_group_members(user_id);