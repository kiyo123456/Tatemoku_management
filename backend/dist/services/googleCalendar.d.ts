import { calendar_v3 } from 'googleapis';
import { AvailabilityRequest, CalendarEvent, AvailableSlot } from '../types';
interface TatemokuSessionData {
    name: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    description?: string;
    attendeeEmails?: string[];
}
export declare class GoogleCalendarService {
    private calendar;
    private oauth2Client;
    constructor();
    setCredentials(accessToken: string): void;
    getUserCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]>;
    getCalendarEvents(timeMin: string, timeMax: string, calendarId?: string): Promise<calendar_v3.Schema$Event[]>;
    getFreeBusyInfo(userEmails: string[], timeMin: string, timeMax: string): Promise<calendar_v3.Schema$FreeBusyResponse>;
    findAvailableSlots(request: AvailabilityRequest): Promise<AvailableSlot[]>;
    createCalendarEvent(event: CalendarEvent): Promise<calendar_v3.Schema$Event>;
    generateAuthUrl(userId: string): string;
    handleAuthCallback(code: string, userId: string): Promise<void>;
    private saveUserTokens;
    private getUserTokens;
    private setupUserAuth;
    createTatemokuEvent(userId: string, sessionData: TatemokuSessionData): Promise<string | null>;
    updateTatemokuEvent(userId: string, eventId: string, sessionData: TatemokuSessionData): Promise<void>;
    deleteTatemokuEvent(userId: string, eventId: string): Promise<void>;
    checkUserCalendarAuth(userId: string): Promise<boolean>;
    revokeUserCalendarAuth(userId: string): Promise<void>;
}
export {};
//# sourceMappingURL=googleCalendar.d.ts.map