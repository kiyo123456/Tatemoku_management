-- サンプルデータ投入スクリプト

-- サンプルユーザー作成
INSERT OR IGNORE INTO users (id, google_id, email, name, picture, role, is_super_admin)
VALUES
  ('user1', 'google_user1', 'yamada@example.com', '山田美咲', 'https://example.com/avatar1.jpg', 'member', false),
  ('user2', 'google_user2', 'takahashi@example.com', '高橋健太', 'https://example.com/avatar2.jpg', 'member', false),
  ('user3', 'google_user3', 'sato@example.com', '佐藤花子', 'https://example.com/avatar3.jpg', 'member', false),
  ('user4', 'google_user4', 'tanaka@example.com', '田中太郎', 'https://example.com/avatar4.jpg', 'member', false),
  ('user5', 'google_user5', 'suzuki@example.com', '鈴木一郎', 'https://example.com/avatar5.jpg', 'member', false),
  ('admin1', 'google_admin1', 'admin@example.com', '管理者', 'https://example.com/admin.jpg', 'super_admin', true);

-- サンプル縦もくセッション作成
INSERT OR IGNORE INTO tatemoku_sessions (id, name, scheduled_date, start_time, end_time, max_participants, status, created_by)
VALUES
  ('session1', '第1回 縦もく', '2025-09-20', '19:00', '21:00', 12, 'active', 'admin1'),
  ('session2', '第2回 縦もく', '2025-09-21', '20:00', '22:00', 12, 'draft', 'admin1');

-- サンプルグループ作成
INSERT OR IGNORE INTO tatemoku_groups (id, session_id, name, group_number, max_members)
VALUES
  ('group1', 'session1', 'Group A', 1, 6),
  ('group2', 'session1', 'Group B', 2, 6);

-- サンプルグループメンバー追加
INSERT OR IGNORE INTO tatemoku_group_members (group_id, user_id, assigned_by)
VALUES
  ('group1', 'user1', 'admin1'),
  ('group1', 'user2', 'admin1'),
  ('group2', 'user3', 'admin1');

-- サンプル未割り当てメンバー
INSERT OR IGNORE INTO tatemoku_unassigned_members (session_id, user_id)
VALUES
  ('session1', 'user4'),
  ('session1', 'user5');