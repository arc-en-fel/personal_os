import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { getTodayWindow, listActivities } from '@/src/lib/activities';
import { Activity } from '@/src/types';
import { colors, spacing } from '@/src/theme';

type Filter = 'today' | 'week' | 'all';

function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function TimelineScreen() {
  const { session } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<Filter>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    setError(null);
    const options = filter === 'today'
      ? getTodayWindow()
      : filter === 'week'
        ? { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
        : {};
    const result = await listActivities(session.user.id, options);
    setItems(result.data);
    setError(result.error?.message ?? null);
    setRefreshing(false);
  }, [filter, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const grouped = useMemo(() => {
    const groups = new Map<string, Activity[]>();
    items.forEach(item => {
      const key = new Date(item.started_at).toDateString();
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return [...groups.entries()];
  }, [items]);

  function startEdit(item: Activity) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
  }

  async function updateActivity() {
    if (!editingId || !editTitle.trim()) return;
    const { error: updateError } = await supabase.from('activities').update({ title: editTitle.trim(), description: editDescription.trim() || null }).eq('id', editingId);
    if (updateError) Alert.alert('Could not update activity', updateError.message);
    else { setEditingId(null); void load(); }
  }

  function deleteActivity(item: Activity) {
    Alert.alert('Delete activity?', `${item.title} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error: deleteError } = await supabase.from('activities').delete().eq('id', item.id);
        if (deleteError) Alert.alert('Could not delete activity', deleteError.message);
        else void load();
      } },
    ]);
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}>
      <Text style={styles.kicker}>YOUR RECORD</Text>
      <Text style={styles.title}>Timeline</Text>
      <Text style={styles.subtitle}>A chronological view of the things you chose to notice.</Text>
      <View style={styles.filters}>{([['today', 'Today'], ['week', '7 days'], ['all', 'All time']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.selectedFilter]}><Text style={[styles.filterText, filter === value && styles.selectedFilterText]}>{label}</Text></Pressable>)}</View>
      {error && <Text style={styles.error}>{error}</Text>}
      {grouped.length ? grouped.map(([key, group]) => <View key={key}>
        <Text style={styles.dateHeading}>{dateLabel(group[0].started_at)}</Text>
        {group.map(item => <View style={styles.row} key={item.id}><View style={styles.time}><Text style={styles.timeText}>{new Date(item.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View><View style={styles.card}>{editingId === item.id ? <><TextInput value={editTitle} onChangeText={setEditTitle} style={styles.input} /><TextInput multiline value={editDescription} onChangeText={setEditDescription} style={[styles.input, styles.notes]} /><View style={styles.actions}><Pressable onPress={() => setEditingId(null)}><Text style={styles.cancel}>Cancel</Text></Pressable><Pressable onPress={() => void updateActivity()}><Text style={styles.edit}>Save changes</Text></Pressable></View></> : <><Text style={styles.type}>{item.type.toUpperCase()}</Text><Text style={styles.itemTitle}>{item.title}</Text>{item.description && <Text style={styles.description}>{item.description}</Text>}<View style={styles.actions}><Pressable onPress={() => startEdit(item)}><Text style={styles.edit}>Edit</Text></Pressable><Pressable onPress={() => deleteActivity(item)}><Text style={styles.delete}>Delete</Text></Pressable></View></>}</View></View>)}
      </View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>{filter === 'today' ? 'Nothing logged today.' : 'Your timeline starts here.'}</Text><Text style={styles.description}>{filter === 'today' ? 'Capture one meaningful moment to make the day visible.' : 'Log an activity and it will appear here.'}</Text></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 100 }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg }, filters: { backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', padding: spacing.xs }, filter: { borderRadius: 10, flex: 1, padding: spacing.sm }, selectedFilter: { backgroundColor: colors.ink }, filterText: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'center' }, selectedFilterText: { color: colors.card }, error: { color: colors.coral, lineHeight: 20, marginTop: spacing.md }, dateHeading: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.xl }, row: { flexDirection: 'row', marginBottom: spacing.md }, time: { paddingTop: spacing.md, width: 62 }, timeText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, card: { backgroundColor: colors.card, borderRadius: 14, flex: 1, padding: spacing.md }, type: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, itemTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 7 }, description: { color: colors.muted, lineHeight: 20, marginTop: 5 }, input: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 10, borderWidth: 1, color: colors.ink, marginTop: spacing.sm, padding: spacing.sm }, notes: { minHeight: 70, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }, edit: { color: colors.sageDark, fontSize: 13, fontWeight: '800' }, delete: { color: colors.coral, fontSize: 13, fontWeight: '800' }, cancel: { color: colors.muted, fontSize: 13, fontWeight: '800' }, empty: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
});
