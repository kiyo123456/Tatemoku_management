-- 縦もく日程調整システム SQLite初期化スクリプト
-- 作成日: 2024-09-18

PRAGMA foreign_keys = ON;

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'member')),
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- グループテーブル
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- グループメンバーテーブル
CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

-- サブグループテーブル
CREATE TABLE IF NOT EXISTS sub_groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    admin_assigned_at TIMESTAMP,
    admin_assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- サブグループメンバーテーブル
CREATE TABLE IF NOT EXISTS sub_group_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    subgroup_id TEXT NOT NULL REFERENCES sub_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subgroup_id, user_id)
);

-- 通知テーブル
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'subgroup_admin_assigned', 'subgroup_updated', 'member_added', etc.
    title TEXT NOT NULL,
    message TEXT,
    data TEXT, -- JSON形式の関連データ
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- 通知の有効期限（オプション）
);

-- サブグループ管理者変更履歴テーブル
CREATE TABLE IF NOT EXISTS subgroup_admin_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    subgroup_id TEXT NOT NULL REFERENCES sub_groups(id) ON DELETE CASCADE,
    old_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    new_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    changed_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- Googleカレンダートークンテーブル
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Googleカレンダーイベント管理テーブル
CREATE TABLE IF NOT EXISTS google_calendar_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL REFERENCES tatemoku_sessions(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, google_event_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_groups_group_id ON sub_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_sub_groups_admin_id ON sub_groups(admin_id);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_subgroup_id ON sub_group_members(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_user_id ON sub_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_subgroup_admin_history_subgroup_id ON subgroup_admin_history(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_session_id ON google_calendar_events(session_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_event_id ON google_calendar_events(google_event_id);

-- サンプルデータ挿入
-- スーパー管理者ユーザー
INSERT OR REPLACE INTO users (id, google_id, email, name, role, is_super_admin) VALUES
('super_admin_1', 'google_super_1', 'super@example.com', 'スーパー管理者', 'super_admin', TRUE);

-- 通常ユーザー
INSERT OR REPLACE INTO users (id, google_id, email, name, role, is_super_admin) VALUES
('user_1', 'google_user_1', 'user1@example.com', '田中太郎', 'member', FALSE),
('user_2', 'google_user_2', 'user2@example.com', '佐藤花子', 'member', FALSE),
('user_3', 'google_user_3', 'user3@example.com', '山田次郎', 'member', FALSE),
('user_4', 'google_user_4', 'user4@example.com', '鈴木美咲', 'member', FALSE),
('user_5', 'google_user_5', 'user5@example.com', '高橋健一', 'member', FALSE);

-- メイングループ
INSERT OR REPLACE INTO groups (id, name, description, created_by) VALUES
('group_main', 'posse②', 'メインの縦もくグループ', 'super_admin_1');

-- グループメンバー
INSERT OR REPLACE INTO group_members (group_id, user_id, role) VALUES
('group_main', 'super_admin_1', 'admin'),
('group_main', 'user_1', 'member'),
('group_main', 'user_2', 'member'),
('group_main', 'user_3', 'member'),
('group_main', 'user_4', 'member'),
('group_main', 'user_5', 'member');

-- サブグループ
INSERT OR REPLACE INTO sub_groups (id, group_id, name, description, admin_id, created_by) VALUES
('subgroup_1', 'group_main', 'フロントエンドチーム', 'フロントエンド開発に集中するサブグループ', 'user_1', 'super_admin_1'),
('subgroup_2', 'group_main', 'バックエンドチーム', 'バックエンド開発に集中するサブグループ', 'user_3', 'super_admin_1'),
('subgroup_3', 'group_main', '企画チーム', '企画・デザインに集中するサブグループ', NULL, 'super_admin_1');

-- サブグループメンバー
INSERT OR REPLACE INTO sub_group_members (subgroup_id, user_id) VALUES
('subgroup_1', 'user_1'),
('subgroup_1', 'user_2'),
('subgroup_2', 'user_3'),
('subgroup_2', 'user_4'),
('subgroup_3', 'user_2'),
('subgroup_3', 'user_5');

-- 管理者指定通知の挿入
INSERT OR REPLACE INTO notifications (user_id, type, title, message, data) VALUES
('user_1', 'subgroup_admin_assigned', 'サブグループ管理者に指定されました', 'フロントエンドチームの管理者に指定されました。', '{"subgroup_id":"subgroup_1","subgroup_name":"フロントエンドチーム"}'),
('user_3', 'subgroup_admin_assigned', 'サブグループ管理者に指定されました', 'バックエンドチームの管理者に指定されました。', '{"subgroup_id":"subgroup_2","subgroup_name":"バックエンドチーム"}');