/**
 * Stub for calendar sync - prevents expo-calendar from loading at app startup
 * Real implementation is in calendar-sync.ts and loaded dynamically
 */

export function getCalendarSyncService() {
  throw new Error(
    'Calendar sync not available. Import calendar-sync.ts dynamically instead.'
  );
}

export class CalendarSyncService {
  static getInstance() {
    throw new Error('Use dynamic import instead');
  }
}
