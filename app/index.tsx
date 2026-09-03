import { Redirect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/src/theme';

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator color={colors.sageDark} /></View>;
  return <Redirect href={session ? '/(tabs)/home' : '/auth'} />;
}
