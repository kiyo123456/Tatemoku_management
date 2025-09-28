-- 縦もく管理システム データベーススキーマ

-- メンバー情報
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    generation VARCHAR(20) NOT NULL, -- 5.0期生、5.5期生など
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 縦もくグループ
CREATE TABLE tatemoku_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_participants INTEGER DEFAULT 6,
    description TEXT,
    version INTEGER DEFAULT 1, -- 楽観的ロック用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 参加者割り当て
CREATE TABLE group_participants (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES tatemoku_groups(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by_user_id INTEGER,
    UNIQUE(group_id, member_id)
);

-- 変更履歴ログ（1ヶ月保持）
CREATE TABLE change_logs (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- 'move_participant', 'add_participant', 'remove_participant'
    member_id INTEGER REFERENCES members(id),
    from_group_id INTEGER REFERENCES tatemoku_groups(id),
    to_group_id INTEGER REFERENCES tatemoku_groups(id),
    changed_by_user_id INTEGER,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Googleカレンダーイベント管理
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES tatemoku_groups(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255),
    management_calendar_id VARCHAR(255), -- ittadakkimyasu@gmail.com用
    participant_invites_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 履歴データの自動削除（1ヶ月後）
CREATE OR REPLACE FUNCTION delete_old_logs() RETURNS void AS $$
BEGIN
    DELETE FROM change_logs WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- インデックス作成
CREATE INDEX idx_group_participants_group_id ON group_participants(group_id);
CREATE INDEX idx_group_participants_member_id ON group_participants(member_id);
CREATE INDEX idx_change_logs_timestamp ON change_logs(timestamp);
CREATE INDEX idx_tatemoku_groups_scheduled_date ON tatemoku_groups(scheduled_date);

-- サンプルデータ
INSERT INTO members (name, email, generation) VALUES
('田中太郎', 'tanaka@example.com', '5.0期生'),
('佐藤花子', 'sato@example.com', '5.5期生'),
('鈴木一郎', 'suzuki@example.com', '5.0期生'),
('山田美咲', 'yamada@example.com', '5.0期生'),
('高橋健太', 'takahashi@example.com', '5.5期生');

INSERT INTO tatemoku_groups (name, scheduled_date, start_time, end_time) VALUES
('Group A', '2025-09-18', '19:00', '21:00'),
('Group B', '2025-09-19', '20:00', '22:00'),
('Group C', '2025-09-20', '19:30', '21:30');