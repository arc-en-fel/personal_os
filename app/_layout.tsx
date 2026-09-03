import { Stack } from 'expo-router';
import { AuthProvider } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

export default function RootLayout() {
  return <AuthProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} /></AuthProvider>;
}
