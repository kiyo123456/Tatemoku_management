-- 縦もく専用テーブル追加スクリプト

-- 縦もくセッションテーブル
CREATE TABLE IF NOT EXISTS tatemoku_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_participants INTEGER DEFAULT 6,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    calendar_registered BOOLEAN DEFAULT FALSE,
    google_calendar_event_id TEXT,
    version INTEGER DEFAULT 1,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 縦もくグループテーブル
CREATE TABLE IF NOT EXISTS tatemoku_groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL REFERENCES tatemoku_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_number INTEGER,
    max_members INTEGER DEFAULT 6,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, group_number)
);

-- 縦もくグループメンバーテーブル
CREATE TABLE IF NOT EXISTS tatemoku_group_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id TEXT NOT NULL REFERENCES tatemoku_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(group_id, user_id)
);

-- 縦もく未割り当てメンバーテーブル
CREATE TABLE IF NOT EXISTS tatemoku_unassigned_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL REFERENCES tatemoku_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- 縦もく変更履歴テーブル
CREATE TABLE IF NOT EXISTS tatemoku_change_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    session_id TEXT NOT NULL REFERENCES tatemoku_sessions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('member_add', 'member_remove', 'member_move', 'group_create', 'group_delete', 'session_update')),
    details TEXT, -- JSON形式の詳細情報
    performed_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tatemoku_sessions_date ON tatemoku_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tatemoku_groups_session ON tatemoku_groups(session_id);
CREATE INDEX IF NOT EXISTS idx_tatemoku_members_group ON tatemoku_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_tatemoku_members_user ON tatemoku_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tatemoku_unassigned_session ON tatemoku_unassigned_members(session_id);
CREATE INDEX IF NOT EXISTS idx_tatemoku_history_session ON tatemoku_change_history(session_id);