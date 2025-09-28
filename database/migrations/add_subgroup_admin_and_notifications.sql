-- サブグループ管理者機能と通知システム追加マイグレーション
-- 実行日: 2024-09-18

-- サブグループテーブルに管理者カラム追加
ALTER TABLE sub_groups
ADD COLUMN admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN admin_assigned_at TIMESTAMP,
ADD COLUMN admin_assigned_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 通知システムテーブル作成
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'subgroup_admin_assigned', 'subgroup_updated', 'member_added', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB, -- 関連データ（サブグループID、操作詳細など）
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- 通知の有効期限（オプション）
);

-- 管理者変更履歴テーブル
CREATE TABLE IF NOT EXISTS subgroup_admin_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subgroup_id UUID NOT NULL REFERENCES sub_groups(id) ON DELETE CASCADE,
    old_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    new_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT -- 変更理由
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_groups_admin_id ON sub_groups(admin_id);
CREATE INDEX IF NOT EXISTS idx_subgroup_admin_history_subgroup ON subgroup_admin_history(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_subgroup_admin_history_new_admin ON subgroup_admin_history(new_admin_id);

-- トリガー関数：サブグループ管理者変更時の通知作成
CREATE OR REPLACE FUNCTION notify_subgroup_admin_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 新しい管理者への通知
    IF NEW.admin_id IS NOT NULL AND (OLD.admin_id IS NULL OR OLD.admin_id != NEW.admin_id) THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            NEW.admin_id,
            'subgroup_admin_assigned',
            'サブグループ管理者に指定されました',
            'あなたが「' || NEW.name || '」サブグループの管理者に指定されました。',
            jsonb_build_object(
                'subgroup_id', NEW.id,
                'subgroup_name', NEW.name,
                'parent_group_id', NEW.parent_group_id,
                'assigned_by', NEW.admin_assigned_by
            )
        );

        -- 管理者変更履歴に記録
        INSERT INTO subgroup_admin_history (subgroup_id, old_admin_id, new_admin_id, changed_by)
        VALUES (NEW.id, OLD.admin_id, NEW.admin_id, NEW.admin_assigned_by);
    END IF;

    -- 前の管理者への通知（管理者が変更された場合）
    IF OLD.admin_id IS NOT NULL AND NEW.admin_id != OLD.admin_id THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            OLD.admin_id,
            'subgroup_admin_removed',
            'サブグループ管理者から外れました',
            '「' || NEW.name || '」サブグループの管理者から外れました。',
            jsonb_build_object(
                'subgroup_id', NEW.id,
                'subgroup_name', NEW.name,
                'parent_group_id', NEW.parent_group_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER subgroup_admin_change_notification
    AFTER UPDATE ON sub_groups
    FOR EACH ROW
    WHEN (OLD.admin_id IS DISTINCT FROM NEW.admin_id)
    EXECUTE FUNCTION notify_subgroup_admin_change();

-- コメント追加
COMMENT ON COLUMN sub_groups.admin_id IS 'サブグループ管理者のユーザーID';
COMMENT ON COLUMN sub_groups.admin_assigned_at IS '管理者が指定された日時';
COMMENT ON COLUMN sub_groups.admin_assigned_by IS '管理者を指定したスーパー管理者のID';
COMMENT ON TABLE notifications IS '通知システムテーブル';
COMMENT ON TABLE subgroup_admin_history IS 'サブグループ管理者変更履歴';

-- サンプル関数：未読通知数取得
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = user_uuid
        AND read = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;