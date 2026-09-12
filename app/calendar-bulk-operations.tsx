import { useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';
import {
  bulkDeleteEvents,
  bulkMoveEvents,
  bulkCopyEvents,
  bulkChangeEventType,
  bulkSyncToDevice,
  bulkAddTag,
  SelectionState,
  initializeSelectionState,
  toggleEventSelection,
  selectAllEvents,
  deselectAllEvents,
} from '@/src/lib/bulk-operations';

export default function CalendarBulkOperationsScreen() {
  const { session } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectionState, setSelectionState] = useState<SelectionState>(initializeSelectionState());
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      setEvents((data as any[]) || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const handleSelectEvent = (eventId: string) => {
    setSelectionState(toggleEventSelection(selectionState, eventId));
  };

  const handleSelectAll = () => {
    if (selectionState.selectAll) {
      setSelectionState(deselectAllEvents(selectionState));
    } else {
      setSelectionState(selectAllEvents(selectionState, events.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectionState.selectedEventIds.size === 0) {
      Alert.alert('No events selected');
      return;
    }

    Alert.alert(
      'Delete Events?',
      `Delete ${selectionState.selectedEventIds.size} event(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setOperating(true);
            try {
              const result = await bulkDeleteEvents(
                session?.user.id || '',
                Array.from(selectionState.selectedEventIds)
              );

              if (result.success) {
                Alert.alert('Success', result.message);
                setSelectionState(deselectAllEvents(selectionState));
                await loadEvents();
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (e) {
              Alert.alert('Error', `Failed to delete: ${String(e)}`);
            } finally {
              setOperating(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkCopy = async () => {
    if (selectionState.selectedEventIds.size === 0) {
      Alert.alert('No events selected');
      return;
    }

    setOperating(true);
    try {
      const result = await bulkCopyEvents(
        session?.user.id || '',
        Array.from(selectionState.selectedEventIds)
      );

      if (result.success) {
        Alert.alert('Success', result.message);
        setSelectionState(deselectAllEvents(selectionState));
        await loadEvents();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to copy: ${String(e)}`);
    } finally {
      setOperating(false);
    }
  };

  const handleBulkSync = async () => {
    if (selectionState.selectedEventIds.size === 0) {
      Alert.alert('No events selected');
      return;
    }

    setOperating(true);
    try {
      const result = await bulkSyncToDevice(
        session?.user.id || '',
        Array.from(selectionState.selectedEventIds)
      );

      if (result.success) {
        Alert.alert('Success', result.message);
        setSelectionState(deselectAllEvents(selectionState));
        await loadEvents();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to sync: ${String(e)}`);
    } finally {
      setOperating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>CALENDAR</Text>
        <Text style={styles.title}>Bulk Operations</Text>
        <Text style={styles.subtitle}>Select multiple events to perform actions on them.</Text>

        {/* Selection Toolbar */}
        {selectionState.isSelectMode && (
          <View style={styles.selectionToolbar}>
            <Text style={styles.selectionCount}>
              {selectionState.selectedEventIds.size} selected
            </Text>

            {/* Bulk Action Buttons */}
            <View style={styles.actionGrid}>
              <Pressable
                onPress={handleBulkCopy}
                disabled={operating}
                style={[styles.actionButton, styles.copyButton]}
              >
                <Text style={styles.actionButtonIcon}>📋</Text>
                <Text style={styles.actionButtonText}>Copy</Text>
              </Pressable>

              <Pressable
                onPress={handleBulkSync}
                disabled={operating}
                style={[styles.actionButton, styles.syncButton]}
              >
                <Text style={styles.actionButtonIcon}>📱</Text>
                <Text style={styles.actionButtonText}>Sync</Text>
              </Pressable>

              <Pressable
                onPress={handleBulkDelete}
                disabled={operating}
                style={[styles.actionButton, styles.deleteButton]}
              >
                <Text style={styles.actionButtonIcon}>🗑</Text>
                <Text style={styles.actionButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Events List */}
        <View style={styles.listHeader}>
          <Pressable
            onPress={handleSelectAll}
            style={styles.selectAllButton}
          >
            <Text style={styles.selectAllText}>
              {selectionState.selectAll ? '✓ Deselect All' : '○ Select All'}
            </Text>
          </Pressable>
          <Text style={styles.listTitle}>Events This Month</Text>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading events...</Text>
        ) : events.length > 0 ? (
          <View>
            {events.map(event => {
              const isSelected = selectionState.selectedEventIds.has(event.id);
              return (
                <Pressable
                  key={event.id}
                  onPress={() => handleSelectEvent(event.id)}
                  style={[styles.eventItem, isSelected && styles.eventItemSelected]}
                >
                  <View style={styles.eventCheckbox}>
                    {isSelected ? (
                      <Text style={styles.checkboxChecked}>✓</Text>
                    ) : (
                      <Text style={styles.checkboxEmpty}>○</Text>
                    )}
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.start_time).toLocaleString()}
                    </Text>
                    <Text style={styles.eventType}>{event.event_type}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No events this month</Text>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Bulk Operations Tips</Text>
          <Text style={styles.tipsText}>
            • Select multiple events by tapping the checkbox{'\n'}
            • Use "Select All" to quickly select all events{'\n'}
            • Copy events to duplicate them{'\n'}
            • Sync to push changes to device calendar{'\n'}
            • Delete removes events permanently
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },

  selectionToolbar: { backgroundColor: colors.sageDark, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  selectionCount: { color: colors.card, fontSize: 14, fontWeight: '800', marginBottom: spacing.md },

  actionGrid: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: 8, gap: spacing.xs },
  copyButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  syncButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  deleteButton: { backgroundColor: colors.coral },
  actionButtonIcon: { fontSize: 20 },
  actionButtonText: { color: colors.card, fontSize: 11, fontWeight: '700' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.md },
  selectAllButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.card, borderRadius: 8 },
  selectAllText: { color: colors.sageDark, fontSize: 13, fontWeight: '700' },
  listTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },

  loadingText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginVertical: spacing.lg },

  eventItem: { backgroundColor: colors.card, borderRadius: 8, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  eventItemSelected: { backgroundColor: '#E0E7FF', borderWidth: 2, borderColor: colors.sageDark },
  eventCheckbox: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxChecked: { color: colors.sageDark, fontSize: 16, fontWeight: '800' },
  checkboxEmpty: { color: colors.muted, fontSize: 16 },

  eventContent: { flex: 1 },
  eventTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  eventTime: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  eventType: { color: colors.sageDark, fontSize: 11, fontWeight: '700', marginTop: spacing.xs },

  emptyState: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, alignItems: 'center', marginVertical: spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },

  tipsSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginTop: spacing.lg },
  tipsTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  tipsText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
