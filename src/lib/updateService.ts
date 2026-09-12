import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

interface UpdateCheckResult {
  isAvailable: boolean;
  isBlocking: boolean;
  error: string | null;
}

interface UpdateInfo {
  appVersion: string;
  runtimeVersion: string;
  updateId: string;
  channel: string;
  createdAt: string;
}

let hasCheckedForUpdates = false;

/**
 * Get update information for debugging/logging
 */
export async function getUpdateInfo(): Promise<UpdateInfo> {
  const updateId = Updates.updateId ?? 'unknown';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const runtimeVersion = Constants.expoConfig?.runtimeVersion?.policy === 'appVersion' 
    ? appVersion 
    : 'unknown';
  const channel = Constants.expoConfig?.extra?.eas?.channel ?? 'default';
  const createdAt = Updates.createdAt?.toISOString() ?? 'unknown';

  return {
    appVersion,
    runtimeVersion,
    updateId,
    channel,
    createdAt,
  };
}

/**
 * Check for available updates
 * Safe to call - won't crash if update service is unavailable
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  // Only check once per app startup
  if (hasCheckedForUpdates) {
    return { isAvailable: false, isBlocking: false, error: null };
  }

  hasCheckedForUpdates = true;

  try {
    // Skip update checks in development (Expo Go)
    if (__DEV__) {
      console.log('[UpdateService] Skipping update check in dev mode');
      return { isAvailable: false, isBlocking: false, error: null };
    }

    console.log('[UpdateService] Checking for updates...');

    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      console.log('[UpdateService] Update available, downloading...');
      await downloadUpdate();
      return { isAvailable: true, isBlocking: update.isBlocking, error: null };
    }

    console.log('[UpdateService] No updates available');
    return { isAvailable: false, isBlocking: false, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[UpdateService] Failed to check for updates:', errorMessage);
    // Don't crash the app if update check fails
    return { isAvailable: false, isBlocking: false, error: errorMessage };
  }
}

/**
 * Download available update
 * Called automatically by checkForUpdates if update is available
 */
async function downloadUpdate(): Promise<void> {
  try {
    console.log('[UpdateService] Downloading update...');
    await Updates.fetchUpdateAsync();
    console.log('[UpdateService] Update downloaded successfully');
    console.log('[UpdateService] Update will be applied on next app restart');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[UpdateService] Failed to download update:', errorMessage);
    // Don't crash - update will be retried on next app start
  }
}

/**
 * Manually check for and apply updates immediately
 * Useful for testing or manual refresh
 */
export async function checkAndApplyUpdateIfAvailable(): Promise<void> {
  try {
    console.log('[UpdateService] Manual update check triggered');
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      console.log('[UpdateService] Downloading and applying update...');
      await Updates.fetchUpdateAsync();
      console.log('[UpdateService] Update downloaded, restarting app...');
      // Reload the app with the new update
      await Updates.reloadAsync();
    } else {
      console.log('[UpdateService] No updates available');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[UpdateService] Manual update check failed:', errorMessage);
    throw error;
  }
}

/**
 * Get update channel name for diagnostics
 */
export function getCurrentUpdateChannel(): string {
  return Constants.expoConfig?.extra?.eas?.channel ?? 'default';
}
