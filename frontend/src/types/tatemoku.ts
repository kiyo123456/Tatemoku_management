// 縦もく管理システムの型定義

export interface Member {
  id: number;
  name: string;
  email: string;
  generation: string; // "5.0期生", "5.5期生" など
  createdAt: string;
}

export interface TatemokuGroup {
  id: number;
  name: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxParticipants: number;
  description?: string;
  version: number; // 楽観的ロック用
  participants: Member[];
  calendarRegistered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeLog {
  id: number;
  actionType: 'move_participant' | 'add_participant' | 'remove_participant' | 'create_group' | 'update_group';
  member?: Member;
  fromGroup?: TatemokuGroup;
  toGroup?: TatemokuGroup;
  changedByUserId: number;
  details?: Record<string, any>;
  timestamp: string;
}

export interface CalendarEvent {
  id: number;
  groupId: number;
  googleEventId?: string;
  managementCalendarId?: string;
  participantInvitesSent: boolean;
  createdAt: string;
}

export interface TatemokuManagementState {
  groups: TatemokuGroup[];
  unassignedMembers: Member[];
  allMembers: Member[];
  changeLogs: ChangeLog[];
  loading: boolean;
  error: string | null;
}

// API レスポンス型
export interface TatemokuGroupsResponse {
  groups: TatemokuGroup[];
  unassignedMembers: Member[];
  totalMembers: number;
}

export interface MoveParticipantRequest {
  memberId: number;
  fromGroupId?: number;
  toGroupId?: number;
  version: number; // 楽観的ロック用
}

export interface CreateCalendarEventRequest {
  groupId: number;
  includeParticipantInvites: boolean;
}

export interface CalendarEventResponse {
  success: boolean;
  eventId?: string;
  invitesSent?: number;
  errors?: string[];
}