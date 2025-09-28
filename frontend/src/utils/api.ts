import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const tokens = localStorage.getItem('tokens');
  if (tokens) {
    try {
      const { accessToken } = JSON.parse(tokens);
      config.headers.Authorization = `Bearer ${accessToken}`;
    } catch (error) {
      console.error('トークンの読み込みに失敗:', error);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('tokens');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  getGoogleAuthUrl: async () => {
    const response = await api.get('/api/auth/google');
    return response.data;
  },

  handleGoogleCallback: async (code: string) => {
    const response = await api.get(`/api/auth/google/callback?code=${code}`);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },

  // 開発用ログイン
  devLogin: async (email: string) => {
    const response = await api.post('/api/auth/dev-login', { email });
    return response.data;
  },
};

export const calendarAPI = {
  // カレンダー一覧を取得
  getCalendars: async (googleAccessToken: string) => {
    const response = await api.get('/api/calendar/calendars', {
      headers: {
        'x-google-token': googleAccessToken
      }
    });
    return response.data;
  },

  // 指定期間のカレンダーイベントを取得
  getEvents: async (params: {
    timeMin: string;
    timeMax: string;
    calendarId?: string;
    googleAccessToken: string;
  }) => {
    const { timeMin, timeMax, calendarId = 'primary', googleAccessToken } = params;
    const response = await api.get('/api/calendar/events', {
      params: { timeMin, timeMax, calendarId },
      headers: {
        'x-google-token': googleAccessToken
      }
    });
    return response.data;
  },

  // 空き時間を検索
  findAvailableSlots: async (request: {
    userEmails: string[];
    timeMin: string;
    timeMax: string;
    duration: number;
    preferredTimes?: Array<{
      start: string;
      end: string;
    }>;
    googleAccessToken: string;
  }) => {
    const { googleAccessToken, ...requestBody } = request;
    const response = await api.post('/api/calendar/availability', requestBody, {
      headers: {
        'x-google-token': googleAccessToken
      }
    });
    return response.data;
  },
};

// 縦もく管理API
export const tatemokuAPI = {
  // 縦もくグループ一覧取得
  getGroups: async () => {
    const response = await api.get('/api/tatemoku/groups');
    return response.data;
  },

  // 参加者移動
  moveParticipant: async (params: {
    memberId: number;
    fromGroupId?: number;
    toGroupId?: number;
    version: number;
  }) => {
    const response = await api.post('/api/tatemoku/move-participant', params);
    return response.data;
  },

  // Googleカレンダーイベント作成
  createCalendarEvent: async (params: {
    groupId: number;
    includeParticipantInvites: boolean;
    googleAccessToken: string;
  }) => {
    const { googleAccessToken, ...requestBody } = params;
    const response = await api.post('/api/tatemoku/create-calendar-event', requestBody, {
      headers: {
        'x-google-token': googleAccessToken
      }
    });
    return response.data;
  },

  // 変更履歴取得
  getChangeLogs: async () => {
    const response = await api.get('/api/tatemoku/change-logs');
    return response.data;
  },

  // ユーザー権限取得
  getUserPermissions: async (userId: number) => {
    const response = await api.get(`/api/tatemoku/users/${userId}/permissions`);
    return response.data;
  },
};

export default api;