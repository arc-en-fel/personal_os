import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/src/theme';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' } }}>
    <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => <Text>⌂</Text> }} />
    <Tabs.Screen name="timeline" options={{ title: 'Timeline', tabBarIcon: () => <Text>◷</Text> }} />
    <Tabs.Screen name="areas" options={{ title: 'Areas', tabBarIcon: () => <Text>◌</Text> }} />
    <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: () => <Text>%</Text> }} />
    <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: () => <Text>?</Text> }} />
  </Tabs>;
}
