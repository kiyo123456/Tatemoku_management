-- サブグループ機能追加マイグレーション
-- 実行日: 2024-09-18

-- サブグループテーブル
CREATE TABLE IF NOT EXISTS sub_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- サブグループメンバーテーブル
CREATE TABLE IF NOT EXISTS sub_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_group_id UUID NOT NULL REFERENCES sub_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- スーパー管理者のID
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sub_group_id, user_id)
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_sub_groups_parent_group ON sub_groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_sub_groups_created_by ON sub_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_sub_group ON sub_group_members(sub_group_id);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_user ON sub_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_group_members_assigned_by ON sub_group_members(assigned_by);

-- トリガー追加（updated_at自動更新）
CREATE TRIGGER update_sub_groups_updated_at
    BEFORE UPDATE ON sub_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE sub_groups IS 'サブグループテーブル - スーパー管理者がグループ内でメンバーを分ける用';
COMMENT ON TABLE sub_group_members IS 'サブグループメンバーテーブル';
COMMENT ON COLUMN sub_group_members.assigned_by IS 'サブグループに割り当てたスーパー管理者のID';

-- サンプルデータ（開発用）
-- INSERT INTO sub_groups (name, parent_group_id, created_by) VALUES
--     ('フロントエンド班', 'parent_group_uuid', 'super_admin_uuid'),
--     ('バックエンド班', 'parent_group_uuid', 'super_admin_uuid');