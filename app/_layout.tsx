import { Stack } from 'expo-router';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

// Suppress Expo Go push notification warnings (SDK 53+)
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = String(args[0]);
  if (message?.includes('Android Push notifications') || message?.includes('expo-notifications')) {
    return;
  }
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = String(args[0]);
  if (message?.includes('Failed to configure notification handler')) {
    return;
  }
  originalWarn(...args);
};

export default function RootLayout() {
  return <AuthProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} /></AuthProvider>;
}
