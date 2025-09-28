'use client';

import React, { useState, useEffect, DragEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  memberCount: number;
  adminId: string;
  adminName: string;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  groupId: string;
  groupName: string;
  joinedAt: string;
  hasSubgroupAssignment?: boolean;
  is_super_admin?: boolean;
}

interface Subgroup {
  id: string;
  name: string;
  description?: string;
  parentGroupId: string;
  memberCount: number;
  members: Member[];
  adminId?: string;
  adminName?: string;
  createdAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

export default function SuperAdminPanel() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [targetSubgroupId, setTargetSubgroupId] = useState('');
  const [availableSubgroups, setAvailableSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'members' | 'grouping' | 'move'>('groups');
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [selectedGroupForSubgroups, setSelectedGroupForSubgroups] = useState('');
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [unassignedMembers, setUnassignedMembers] = useState<Member[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [showAdminSelect, setShowAdminSelect] = useState<string | null>(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<string | null>(null);
  const [groupSubgroups, setGroupSubgroups] = useState<Subgroup[]>([]);

  // ドラッグ&ドロップ用のstate
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [dragOverSubgroup, setDragOverSubgroup] = useState<string | null>(null);

  // メンバー一覧のページネーションとフィルター状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 権限変更用の状態
  const [roleChangeModal, setRoleChangeModal] = useState<{memberId: string, memberName: string, currentRole: string, isSuperAdmin: boolean} | null>(null);
  const [isRoleChanging, setIsRoleChanging] = useState(false);

  // スーパー管理者権限チェック
  const isSuperAdmin = Boolean(user?.is_super_admin);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchGroups();
      fetchMembers();
      fetchAdminUsers();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (groups.length > 0) {
      fetchAllSubgroups();
    }
  }, [groups]);

  useEffect(() => {
    if (selectedGroupForSubgroups) {
      fetchSubgroups(selectedGroupForSubgroups);
      fetchUnassignedMembers(selectedGroupForSubgroups);
    }
  }, [selectedGroupForSubgroups]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/test-data');
      const data = await response.json();
      if (data.groups) {
        setGroups(data.groups);
      }
      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error('グループ取得エラー:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/test-data');
      const data = await response.json();
      if (data.members) {
        // 重複除去：同じIDの場合は最初のものを残す
        const uniqueMembers = data.members.filter((member: Member, index: number, self: Member[]) =>
          self.findIndex(m => m.id === member.id) === index
        );
        setMembers(uniqueMembers);
      }
    } catch (error) {
      console.error('メンバー取得エラー:', error);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch('http://localhost:3001/api/admin/admin-users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (data.success && data.adminUsers) {
        setAdminUsers(data.adminUsers);
      }
    } catch (error) {
      console.error('管理者一覧取得エラー:', error);
    }
  };

  const fetchSubgroups = async (groupId: string) => {
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/subgroups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (data.subgroups) {
        setSubgroups(data.subgroups);
      }
    } catch (error) {
      console.error('サブグループ取得エラー:', error);
    }
  };

  const fetchUnassignedMembers = async (groupId: string) => {
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/members?groupId=${groupId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (data.members) {
        const unassigned = data.members.filter((member: Member) => !member.hasSubgroupAssignment);
        setUnassignedMembers(unassigned);
      }
    } catch (error) {
      console.error('未割り当てメンバー取得エラー:', error);
    }
  };

  const createSubgroup = async () => {
    if (!selectedGroupForSubgroups || !newSubgroupName.trim()) return;

    setLoading(true);
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch('http://localhost:3001/api/admin/subgroups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newSubgroupName.trim(),
          description: '',
          parentGroupId: selectedGroupForSubgroups
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('サブグループを作成しました');
        setNewSubgroupName('');
        fetchSubgroups(selectedGroupForSubgroups);
        fetchUnassignedMembers(selectedGroupForSubgroups);
      } else {
        alert('サブグループの作成に失敗しました: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('サブグループ作成エラー:', error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const fetchAllSubgroups = async () => {
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const allSubgroups: Subgroup[] = [];

      for (const group of groups) {
        const response = await fetch(`http://localhost:3001/api/admin/subgroups/${group.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const data = await response.json();
        if (data.subgroups) {
          allSubgroups.push(...data.subgroups);
        }
      }

      setAvailableSubgroups(allSubgroups);
    } catch (error) {
      console.error('サブグループ一覧取得エラー:', error);
    }
  };

  const moveToSubgroup = async () => {
    if (!selectedMember || !targetSubgroupId) return;

    setLoading(true);
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/subgroups/${targetSubgroupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userIds: [selectedMember.id]
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('メンバーをサブグループに移動しました');
        fetchMembers();
        setSelectedMember(null);
        setTargetSubgroupId('');
        // 関連するサブグループを再取得
        if (selectedGroupForSubgroups) {
          fetchSubgroups(selectedGroupForSubgroups);
          fetchUnassignedMembers(selectedGroupForSubgroups);
        }
      } else {
        alert('メンバーの移動に失敗しました: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('メンバー移動エラー:', error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };


  const removeFromCurrentSubgroup = async (memberId: string) => {
    // メンバーを全てのサブグループから削除
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/members/${memberId}/subgroups`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('メンバー削除エラー:', error);
      return false;
    }
  };

  const assignToSubgroup = async (subgroupId: string, memberIds: string[]) => {
    setLoading(true);
    try {
      // 既存のサブグループからメンバーを削除
      for (const memberId of memberIds) {
        await removeFromCurrentSubgroup(memberId);
      }

      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/subgroups/${subgroupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userIds: memberIds
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchSubgroups(selectedGroupForSubgroups);
        fetchUnassignedMembers(selectedGroupForSubgroups);
      } else {
        alert('メンバーの割り当てに失敗しました');
      }
    } catch (error) {
      console.error('メンバー割り当てエラー:', error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const deleteSubgroup = async (subgroupId: string) => {
    if (!confirm('このサブグループを削除しますか？メンバーは未割り当てに戻ります。')) {
      return;
    }

    setLoading(true);
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/subgroups/${subgroupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('サブグループを削除しました');
        fetchSubgroups(selectedGroupForSubgroups);
        fetchUnassignedMembers(selectedGroupForSubgroups);
      } else {
        alert('サブグループの削除に失敗しました');
      }
    } catch (error) {
      console.error('サブグループ削除エラー:', error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const assignSubgroupAdmin = async (subgroupId: string, adminId: string) => {
    setLoading(true);
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/subgroups/${subgroupId}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          adminId
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('サブグループ管理者を指定しました');
        fetchSubgroups(selectedGroupForSubgroups);
      } else {
        alert('管理者の指定に失敗しました');
      }
    } catch (error) {
      console.error('管理者指定エラー:', error);
      alert('エラーが発生しました');
    }
    setLoading(false);
  };

  const fetchGroupSubgroups = async (groupId: string) => {
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/subgroups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (data.subgroups) {
        setGroupSubgroups(data.subgroups);
      }
    } catch (error) {
      console.error('グループサブグループ取得エラー:', error);
    }
  };

  const handleGroupClick = (groupId: string) => {
    if (selectedGroupDetails === groupId) {
      setSelectedGroupDetails(null);
      setGroupSubgroups([]);
    } else {
      setSelectedGroupDetails(groupId);
      fetchGroupSubgroups(groupId);
    }
  };

  // ドラッグ&ドロップハンドラー
  const handleDragStart = (e: DragEvent<HTMLDivElement>, member: Member) => {
    setDraggedMember(member);
    e.dataTransfer.setData('text/plain', JSON.stringify(member));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, subgroupId: string) => {
    e.preventDefault();
    setDragOverSubgroup(subgroupId);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSubgroup(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, subgroupId: string) => {
    e.preventDefault();
    setDragOverSubgroup(null);

    if (!draggedMember) return;

    // メンバーをサブグループに自動割り当て
    assignToSubgroup(subgroupId, [draggedMember.id]);
    setDraggedMember(null);
  };

  const handleDragEnd = () => {
    setDraggedMember(null);
    setDragOverSubgroup(null);
  };

  // 権限変更関数
  const handleRoleChange = async (newRole: string) => {
    if (!roleChangeModal) return;

    setIsRoleChanging(true);
    try {
      // AuthContextに合わせて、まずaccessTokenを直接取得、なければtokensオブジェクトから取得
      let accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        const tokens = localStorage.getItem('tokens');
        accessToken = tokens ? JSON.parse(tokens).accessToken : null;
      }

      const response = await fetch(`http://localhost:3001/api/admin/members/${roleChangeModal.memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        alert(`${roleChangeModal.memberName}の権限を変更しました`);
        fetchMembers(); // メンバー一覧を再取得
        setRoleChangeModal(null);
      } else {
        alert('権限変更に失敗しました: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('権限変更エラー:', error);
      alert('権限変更に失敗しました');
    } finally {
      setIsRoleChanging(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">アクセス権限がありません</h3>
        <p className="text-red-600">この画面はposse②代表のみアクセス可能です。</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              スーパー管理者パネル
            </h2>
            <p className="text-gray-600">
              posse②代表専用 - 全グループ・メンバーの管理
            </p>
          </div>

          {/* タブ */}
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              グループ管理
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              メンバー一覧
            </button>
            <button
              onClick={() => setActiveTab('grouping')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'grouping'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              グルーピング
            </button>
            <button
              onClick={() => setActiveTab('move')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'move'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              サブグループ移動
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* グループ管理タブ */}
          {activeTab === 'groups' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">全グループ一覧</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        グループ名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        メンバー数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        管理者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        作成日
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groups.map((group) => (
                      <React.Fragment key={group.id}>
                        <tr
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleGroupClick(group.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <span className={`mr-2 transition-transform ${
                                selectedGroupDetails === group.id ? 'rotate-90' : ''
                              }`}>
                                ▶
                              </span>
                              {group.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.memberCount}人
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {group.adminName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(group.createdAt).toLocaleDateString('ja-JP')}
                          </td>
                        </tr>
                        {selectedGroupDetails === group.id && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 bg-gray-50">
                              <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-medium text-lg mb-3 text-gray-900">
                                  {group.name} のサブグループ詳細
                                </h4>
                                {groupSubgroups.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupSubgroups.map((subgroup, index) => (
                                      <div key={subgroup.id} className={`border rounded-lg p-3 ${
                                        index % 4 === 0 ? 'border-blue-200 bg-blue-50' :
                                        index % 4 === 1 ? 'border-green-200 bg-green-50' :
                                        index % 4 === 2 ? 'border-purple-200 bg-purple-50' : 'border-orange-200 bg-orange-50'
                                      }`}>
                                        <div className="flex justify-between items-start mb-2">
                                          <h5 className={`font-medium ${
                                            index % 4 === 0 ? 'text-blue-700' :
                                            index % 4 === 1 ? 'text-green-700' :
                                            index % 4 === 2 ? 'text-purple-700' : 'text-orange-700'
                                          }`}>
                                            {subgroup.name}
                                          </h5>
                                          <span className="text-xs text-gray-900">
                                            {subgroup.memberCount}人
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-900 mb-2">
                                          管理者: {subgroup.adminName || '未指定'}
                                        </div>
                                        <div className="space-y-1">
                                          {subgroup.members?.map((member) => (
                                            <div key={member.id} className="text-xs bg-white px-2 py-1 rounded border text-gray-900">
                                              {member.name}
                                            </div>
                                          )) || (
                                            <div className="text-xs text-gray-700 italic">メンバーなし</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-700">
                                    <p>このグループにはまだサブグループが作成されていません</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* メンバー一覧タブ */}
          {activeTab === 'members' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">全メンバー一覧</h3>
                <div className="text-sm text-gray-600">
                  総メンバー数: {members.length}人
                </div>
              </div>

              {/* フィルターとサーチ */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* 役割フィルター */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      役割で絞り込み
                    </label>
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value as 'all' | 'admin' | 'member');
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    >
                      <option value="all">すべて</option>
                      <option value="admin">管理者のみ</option>
                      <option value="member">メンバーのみ</option>
                    </select>
                  </div>

                  {/* 名前・メール検索 */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名前・メールで検索
                    </label>
                    <input
                      type="text"
                      placeholder="名前またはメールアドレスを入力..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-700"
                    />
                  </div>
                </div>

                {/* クリアボタン */}
                {(roleFilter !== 'all' || searchQuery) && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setRoleFilter('all');
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      フィルターをクリア
                    </button>
                  </div>
                )}
              </div>

              {/* メンバーテーブル */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        名前
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        メールアドレス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        権限
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        所属グループ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        参加日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      // フィルタリング処理
                      let filteredMembers = members.filter((member) => {
                        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
                        const matchesSearch = !searchQuery ||
                          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesRole && matchesSearch;
                      });

                      // ページネーション処理
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

                      if (paginatedMembers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              {searchQuery || roleFilter !== 'all'
                                ? '条件に一致するメンバーが見つかりません'
                                : 'メンバーがいません'
                              }
                            </td>
                          </tr>
                        );
                      }

                      return paginatedMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              Boolean(member.is_super_admin)
                                ? 'bg-purple-100 text-purple-800'
                                : member.role === 'admin'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {Boolean(member.is_super_admin) ? '代表' :
                               member.role === 'admin' ? '管理者' : 'メンバー'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.groupName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('ja-JP') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {user?.id !== member.id && (
                              <button
                                onClick={() => setRoleChangeModal({
                                  memberId: member.id,
                                  memberName: member.name,
                                  currentRole: member.role,
                                  isSuperAdmin: Boolean(member.is_super_admin)
                                })}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                              >
                                権限変更
                              </button>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* ページネーション */}
              {(() => {
                // フィルタリングされたメンバー数を計算
                const filteredMembers = members.filter((member) => {
                  const matchesRole = roleFilter === 'all' || member.role === roleFilter;
                  const matchesSearch = !searchQuery ||
                    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesRole && matchesSearch;
                });

                const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

                if (totalPages <= 1) return null;

                return (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        前へ
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        次へ
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                          から
                          <span className="font-medium"> {Math.min(currentPage * itemsPerPage, filteredMembers.length)} </span>
                          件を表示中（全
                          <span className="font-medium"> {filteredMembers.length} </span>
                          件）
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                          >
                            <span className="sr-only">前のページ</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                            if (totalPages > 7) {
                              // 多くのページがある場合の省略表示ロジック
                              if (pageNum === 1 || pageNum === totalPages ||
                                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                      currentPage === pageNum
                                        ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              } else if (pageNum === 2 && currentPage > 4) {
                                return <span key={pageNum} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>;
                              } else if (pageNum === totalPages - 1 && currentPage < totalPages - 3) {
                                return <span key={pageNum} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>;
                              }
                              return null;
                            } else {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                    currentPage === pageNum
                                      ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            }
                          })}

                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                          >
                            <span className="sr-only">次のページ</span>
                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* グルーピングタブ */}
          {activeTab === 'grouping' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">サブグループ管理</h3>

              {/* グループ選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  管理するグループを選択
                </label>
                <select
                  value={selectedGroupForSubgroups}
                  onChange={(e) => setSelectedGroupForSubgroups(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                >
                  <option value="">グループを選択...</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGroupForSubgroups && (
                <>
                  {/* サブグループ作成 */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-medium mb-3 text-gray-900">新しいサブグループを作成</h4>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="サブグループ名"
                        value={newSubgroupName}
                        onChange={(e) => setNewSubgroupName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700"
                      />
                      <button
                        onClick={createSubgroup}
                        disabled={!newSubgroupName.trim() || loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                      >
                        {loading ? '作成中...' : '作成'}
                      </button>
                    </div>
                  </div>

                  {/* 既存サブグループ一覧 */}
                  <div className="space-y-6">
                    {subgroups.length > 0 ? (
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium text-gray-900">
                            {groups.find(g => g.id === selectedGroupForSubgroups)?.name}
                          </h4>
                          <span className="text-sm text-gray-900">
                            {subgroups.reduce((total, sub) => total + sub.memberCount, 0) + unassignedMembers.length}人のメンバー
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {subgroups.map((subgroup, index) => (
                            <div
                              key={subgroup.id}
                              className={`border-l-4 pl-4 transition-colors ${
                                dragOverSubgroup === subgroup.id
                                  ? 'bg-blue-50 border-blue-400'
                                  : index % 4 === 0 ? 'border-blue-500' :
                                  index % 4 === 1 ? 'border-green-500' :
                                  index % 4 === 2 ? 'border-purple-500' : 'border-orange-500'
                              }`}
                              onDragOver={handleDragOver}
                              onDragEnter={(e) => handleDragEnter(e, subgroup.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, subgroup.id)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h5 className={`font-medium flex items-center gap-2 ${
                                    index % 4 === 0 ? 'text-blue-700' :
                                    index % 4 === 1 ? 'text-green-700' :
                                    index % 4 === 2 ? 'text-purple-700' : 'text-orange-700'
                                  }`}>
                                    {subgroup.name}
                                    {dragOverSubgroup === subgroup.id && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        ここにドロップ
                                      </span>
                                    )}
                                  </h5>
                                  <div className="mt-1 text-xs text-gray-900">
                                    管理者: {subgroup.adminName || '未指定'}
                                    {!subgroup.adminId && (
                                      <div className="mt-1">
                                        {showAdminSelect === subgroup.id ? (
                                          <div className="flex gap-2 items-center">
                                            <select
                                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                                              onChange={(e) => {
                                                const selectedAdminId = e.target.value;
                                                if (selectedAdminId) {
                                                  assignSubgroupAdmin(subgroup.id, selectedAdminId);
                                                  setShowAdminSelect(null);
                                                }
                                              }}
                                              defaultValue=""
                                            >
                                              <option value="">管理者を選択...</option>
                                              {adminUsers.map((admin) => (
                                                <option key={admin.id} value={admin.id}>
                                                  {admin.name} ({admin.isSuperAdmin ? '代表' : '管理者'})
                                                </option>
                                              ))}
                                            </select>
                                            <button
                                              onClick={() => setShowAdminSelect(null)}
                                              className="text-xs text-gray-900 hover:text-gray-600"
                                            >
                                              キャンセル
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => setShowAdminSelect(subgroup.id)}
                                            className="ml-2 text-blue-500 hover:text-blue-700 underline text-xs"
                                          >
                                            指定
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteSubgroup(subgroup.id)}
                                  className="text-red-500 hover:text-red-700 text-sm ml-2"
                                  disabled={loading}
                                >
                                  削除
                                </button>
                              </div>

                              <div className="mt-2 space-y-1 text-gray-900">
                                {subgroup.members?.map((member) => (
                                  <div
                                    key={member.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, member)}
                                    onDragEnd={handleDragEnd}
                                    className={`text-sm p-2 rounded flex justify-between cursor-move transition-all hover:shadow-md ${
                                      draggedMember?.id === member.id
                                        ? 'opacity-50 rotate-1'
                                        : index % 4 === 0 ? 'bg-blue-50 hover:bg-blue-100' :
                                        index % 4 === 1 ? 'bg-green-50 hover:bg-green-100' :
                                        index % 4 === 2 ? 'bg-purple-50 hover:bg-purple-100' : 'bg-orange-50 hover:bg-orange-100'
                                    }`}
                                  >
                                    <span>{member.name}</span>
                                    <span className="text-xs text-gray-500">🖱️</span>
                                  </div>
                                )) || (
                                  <div className="text-sm text-gray-900 italic p-2">メンバーなし</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 未割り当てメンバー */}
                        {unassignedMembers.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <h5 className="font-medium text-gray-900 mb-3">
                              未割り当てメンバー
                              <span className="text-sm font-normal text-gray-600 ml-2">
                                ドラッグ&ドロップでサブグループに割り当て
                              </span>
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {unassignedMembers.map((member) => (
                                <div
                                  key={member.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, member)}
                                  onDragEnd={handleDragEnd}
                                  className={`bg-gray-100 px-3 py-1 rounded-full text-sm cursor-move hover:bg-gray-200 flex items-center gap-2 text-gray-900 transition-all ${
                                    draggedMember?.id === member.id ? 'opacity-50 rotate-3' : ''
                                  }`}
                                >
                                  <span>{member.name}</span>
                                  <span className="text-xs text-gray-500">🖱️ ドラッグして移動</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-900">
                        <p>まだサブグループが作成されていません</p>
                        <p className="text-sm">上のフォームから新しいサブグループを作成してください</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* メンバー移動タブ */}
          {activeTab === 'move' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">サブグループへメンバー移動</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    移動対象メンバー
                  </label>
                  <select
                    value={selectedMember?.id || ''}
                    onChange={(e) => {
                      const member = members.find(m => m.id === e.target.value);
                      setSelectedMember(member || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  >
                    <option value="">メンバーを選択...</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.groupName})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMember && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      移動先サブグループ
                    </label>
                    <select
                      value={targetSubgroupId}
                      onChange={(e) => setTargetSubgroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    >
                      <option value="">サブグループを選択...</option>
                      {availableSubgroups.map((subgroup) => {
                        const parentGroup = groups.find(g => g.id === subgroup.parentGroupId);
                        return (
                          <option key={subgroup.id} value={subgroup.id}>
                            {parentGroup?.name} {'>'} {subgroup.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <button
                  onClick={moveToSubgroup}
                  disabled={!selectedMember || !targetSubgroupId || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                  {loading ? '移動中...' : 'サブグループに移動'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 権限変更モーダル */}
      {roleChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">権限変更</h3>
            <p className="text-gray-600 mb-4">
              <span className="font-medium">{roleChangeModal.memberName}</span> の権限を変更します。
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                現在の権限: <span className="text-blue-600">
                  {roleChangeModal.isSuperAdmin ? '代表' :
                   roleChangeModal.currentRole === 'admin' ? '管理者' : 'メンバー'}
                </span>
              </label>
            </div>

            <div className="space-y-2 mb-6">
              <button
                onClick={() => handleRoleChange('member')}
                disabled={isRoleChanging || (roleChangeModal.currentRole === 'member' && !roleChangeModal.isSuperAdmin)}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <span className="text-gray-800">メンバー</span>
                <span className="text-gray-500 text-sm block">一般ユーザー権限</span>
              </button>

              <button
                onClick={() => handleRoleChange('admin')}
                disabled={isRoleChanging || (roleChangeModal.currentRole === 'admin' && !roleChangeModal.isSuperAdmin)}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <span className="text-blue-800">管理者</span>
                <span className="text-gray-500 text-sm block">グループ管理権限</span>
              </button>

              <button
                onClick={() => handleRoleChange('super_admin')}
                disabled={isRoleChanging || roleChangeModal.isSuperAdmin}
                className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <span className="text-purple-800">代表</span>
                <span className="text-gray-500 text-sm block">全システム管理権限</span>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setRoleChangeModal(null)}
                disabled={isRoleChanging}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>

            {isRoleChanging && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                  <span className="text-sm text-gray-600">権限変更中...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
