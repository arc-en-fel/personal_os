/**
 * Safe loader for calendar-sync that can be dynamically imported
 * This avoids loading expo-calendar at app startup
 */

export async function loadCalendarSync() {
  const module = await import('./calendar-sync');
  return module.getCalendarSyncService();
}

export async function initializeCalendarSync(userId: string) {
  try {
    const service = await loadCalendarSync();
    await service.initialize(userId);
    return service;
  } catch (e) {
    console.warn('Failed to initialize calendar sync:', e);
    return null;
  }
}
