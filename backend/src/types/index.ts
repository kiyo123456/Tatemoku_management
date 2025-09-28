export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  accessToken?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchedulingSession {
  id: string;
  groupId: string;
  title: string;
  duration: number;
  suggestedSlots: TimeSlot[];
  selectedSlot?: TimeSlot;
  status: 'draft' | 'proposed' | 'confirmed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  availableMembers: string[];
  participantCount: number;
}

export interface FreeBusyResponse {
  calendars: {
    [email: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
    };
  };
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
}

export interface AvailabilityRequest {
  userEmails: string[];
  timeMin: string;
  timeMax: string;
  duration: number;
  preferredTimes?: Array<{
    start: string;
    end: string;
  }>;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  availableMembers: string[];
  participantCount: number;
  score: number;
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
}