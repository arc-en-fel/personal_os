import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { Activity } from '@/src/types';
import { colors, spacing } from '@/src/theme';

export default function TimelineScreen() {
  const { session } = useAuth(); const [items, setItems] = useState<Activity[]>([]); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (!session) return; setRefreshing(true); const { data } = await supabase.from('activities').select('*').order('started_at', { ascending: false }); setItems((data as Activity[] | null) ?? []); setRefreshing(false); }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}><Text style={styles.kicker}>YOUR RECORD</Text><Text style={styles.title}>Timeline</Text><Text style={styles.subtitle}>A chronological view of the things you chose to notice.</Text>{items.length ? items.map(item => <View style={styles.row} key={item.id}><View style={styles.time}><Text style={styles.timeText}>{new Date(item.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View><View style={styles.card}><Text style={styles.type}>{item.type.toUpperCase()}</Text><Text style={styles.itemTitle}>{item.title}</Text>{item.description && <Text style={styles.description}>{item.description}</Text>}</View></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Your timeline starts here.</Text><Text style={styles.description}>Log your first activity and it will appear here.</Text></View>}</ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 100 }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.xl }, row: { flexDirection: 'row', marginBottom: spacing.md }, time: { paddingTop: spacing.md, width: 62 }, timeText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, card: { backgroundColor: colors.card, borderRadius: 14, flex: 1, padding: spacing.md }, type: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, itemTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 7 }, description: { color: colors.muted, lineHeight: 20, marginTop: 5 }, empty: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 6 } });
