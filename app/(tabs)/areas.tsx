import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '@/src/theme';

const builtInAreas = ['Fitness', 'Learning', 'Projects', 'Goals', 'Finance', 'Nutrition', 'Knowledge'];

export default function AreasScreen() {
  function openBuiltIn(area: string) {
    const routes: Record<string, '/fitness' | '/learning' | '/projects' | '/goals' | '/finance' | '/nutrition' | '/knowledge'> = {
      Fitness: '/fitness',
      Learning: '/learning',
      Projects: '/projects',
      Goals: '/goals',
      Finance: '/finance',
      Nutrition: '/nutrition',
      Knowledge: '/knowledge'
    };
    const route = routes[area];
    if (route) router.push(route);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>THE BIG PICTURE</Text>
      <Text style={styles.title}>Areas</Text>
      <Text style={styles.subtitle}>The parts of life you are actively tending.</Text>

      <View style={styles.grid}>
        {builtInAreas.map((area, index) => (
          <Pressable
            key={area}
            onPress={() => openBuiltIn(area)}
            style={[styles.card, { backgroundColor: index % 2 ? '#F2E9D5' : '#DCE8D8' }]}
          >
            <Text style={styles.icon}>{['O', '*', '[]', '#', 'o', '+', '~'][index]}</Text>
            <Text style={styles.area}>{area}</Text>
            <Text style={styles.meta}>Open area</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 100 },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: spacing.xl, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderRadius: 16, padding: spacing.md, width: '48%' },
  icon: { color: colors.ink, fontSize: 23 },
  area: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: spacing.lg },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 }
});
