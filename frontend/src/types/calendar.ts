export interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  description?: string;
  status?: string;
}

export interface AvailableSlot {
  start: string; // ISO string
  end: string; // ISO string
  availableMembers: string[];
  participantCount: number;
  participantRate: number;
}

export interface AvailabilityRequest {
  userEmails: string[];
  timeMin: string; // ISO string
  timeMax: string; // ISO string
  duration: number; // minutes
  preferredTimes?: Array<{
    start: string; // ISO string
    end: string; // ISO string
  }>;
}

export interface AvailabilityResponse {
  message: string;
  data: {
    totalSlotsFound: number;
    bestSlots: AvailableSlot[];
    searchCriteria: {
      duration: number;
      participantCount: number;
      searchPeriod: {
        from: string;
        to: string;
      };
    };
  };
}

export interface CalendarAPIResponse<T = unknown> {
  message: string;
  data?: T;
  error?: string;
}