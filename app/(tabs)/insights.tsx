import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type Stats = { activities: number; workouts: number; learningMinutes: number; spending: number; projects: number; goals: number };

export default function InsightsScreen() {
  const { session } = useAuth();
  const [stats, setStats] = useState<Stats>({ activities: 0, workouts: 0, learningMinutes: 0, spending: 0, projects: 0, goals: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    const start = new Date(); start.setDate(start.getDate() - 7);
    const [{ data: activities }, { data: transactions }, { count: projectCount }, { count: goalCount }] = await Promise.all([
      supabase.from('activities').select('type, metadata').gte('started_at', start.toISOString()),
      supabase.from('transactions').select('amount, transaction_type').eq('transaction_type', 'expense').gte('transaction_date', start.toISOString().slice(0, 10)),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('goals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    const activityRows = (activities ?? []) as { type: string; metadata: Record<string, unknown> }[];
    setStats({
      activities: activityRows.length,
      workouts: activityRows.filter(item => item.type === 'workout').length,
      learningMinutes: activityRows.filter(item => item.type === 'learning').reduce((sum, item) => sum + (Number(item.metadata.duration_minutes) || 0), 0),
      spending: (transactions ?? []).reduce((sum, item) => sum + Number(item.amount), 0),
      projects: projectCount ?? 0,
      goals: goalCount ?? 0,
    });
    setRefreshing(false);
  }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}><Text style={styles.kicker}>THE LAST 7 DAYS</Text><Text style={styles.title}>Insights</Text><Text style={styles.subtitle}>A factual snapshot of what your records currently show.</Text><View style={styles.grid}><Stat label="Activities" value={String(stats.activities)} /><Stat label="Workouts" value={String(stats.workouts)} /><Stat label="Study time" value={`${stats.learningMinutes} min`} /><Stat label="Spending" value={stats.spending.toFixed(2)} /></View><Text style={styles.sectionTitle}>What is active</Text><View style={styles.activeRow}><View><Text style={styles.activeValue}>{stats.goals}</Text><Text style={styles.activeLabel}>active goals</Text></View><View><Text style={styles.activeValue}>{stats.projects}</Text><Text style={styles.activeLabel}>active projects</Text></View></View><View style={styles.note}><Text style={styles.noteTitle}>Keep recording</Text><Text style={styles.noteBody}>These numbers become more useful as your timeline gets richer. Insights here are calculated from stored records, not generated assumptions.</Text></View></ScrollView>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 100 }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.xl }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, stat: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, width: '48%' }, statValue: { color: colors.ink, fontSize: 24, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 13, marginTop: 5 }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.xl }, activeRow: { backgroundColor: colors.sage, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-around', padding: spacing.lg }, activeValue: { color: colors.ink, fontSize: 29, fontWeight: '800', textAlign: 'center' }, activeLabel: { color: colors.sageDark, fontSize: 12, fontWeight: '700', marginTop: 4 }, note: { backgroundColor: '#F2E9D5', borderRadius: 14, marginTop: spacing.lg, padding: spacing.md }, noteTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, noteBody: { color: colors.muted, lineHeight: 20, marginTop: 6 } });
