import { useCallback, useState, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
};

type FilterOptions = {
  eventTypes: string[];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  searchText: string;
  sortBy: 'date' | 'title' | 'type';
};

export default function CalendarSearchScreen() {
  const { session } = useAuth();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>(['reminder', 'goal_deadline', 'study_session', 'custom']);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date');

  const loadEvents = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // Sync calendar first
      await supabase.functions.invoke('sync-calendar', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      // Load all events for the past year and future
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const oneYearFuture = new Date();
      oneYearFuture.setFullYear(oneYearFuture.getFullYear() + 1);

      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', oneYearAgo.toISOString())
        .lte('start_time', oneYearFuture.toISOString())
        .order('start_time', { ascending: true });

      setAllEvents((data as CalendarEvent[] | null) ?? []);
    } catch (e) {
      console.error('Failed to load events:', e);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const getDateRangeFilter = (): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek;
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'all':
      default:
        start.setFullYear(start.getFullYear() - 1);
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return { start, end };
  };

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...allEvents];

    // Filter by event type
    result = result.filter(e => eventTypes.includes(e.event_type));

    // Filter by date range
    const { start: rangeStart, end: rangeEnd } = getDateRangeFilter();
    result = result.filter(e => {
      const eventDate = new Date(e.start_time);
      return eventDate >= rangeStart && eventDate <= rangeEnd;
    });

    // Filter by search text
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(search) ||
        (e.description && e.description.toLowerCase().includes(search))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.event_type.localeCompare(b.event_type);
        case 'date':
        default:
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
    });

    return result;
  }, [allEvents, searchText, eventTypes, dateRange, sortBy]);

  const toggleEventType = (type: string) => {
    setEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'reminder':
        return colors.sageDark;
      case 'goal_deadline':
        return colors.coral;
      case 'study_session':
        return '#8B5CF6';
      default:
        return colors.ink;
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>

          <Text style={styles.kicker}>CALENDAR</Text>
          <Text style={styles.title}>Search & Filter</Text>
          <Text style={styles.subtitle}>Find and organize your calendar events.</Text>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search events, reminders, goals..."
              placeholderTextColor={colors.muted}
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
            />
            {searchText && (
              <Pressable onPress={() => setSearchText('')}>
                <Text style={styles.clearButton}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Controls */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Event Types</Text>
          <View style={styles.filterButtons}>
            {[
              { key: 'reminder', label: 'Reminders' },
              { key: 'goal_deadline', label: 'Goals' },
              { key: 'study_session', label: 'Study' },
              { key: 'custom', label: 'Custom' },
            ].map(item => (
              <Pressable
                key={item.key}
                onPress={() => toggleEventType(item.key)}
                style={[
                  styles.filterButton,
                  eventTypes.includes(item.key) && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    eventTypes.includes(item.key) && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterTitle, { marginTop: spacing.lg }]}>Date Range</Text>
          <View style={styles.filterButtons}>
            {['today', 'week', 'month', 'all'].map(range => (
              <Pressable
                key={range}
                onPress={() => setDateRange(range as typeof dateRange)}
                style={[
                  styles.filterButton,
                  dateRange === range && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dateRange === range && styles.filterButtonTextActive,
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.filterTitle, { marginTop: spacing.lg }]}>Sort By</Text>
          <View style={styles.filterButtons}>
            {[
              { key: 'date', label: 'Date' },
              { key: 'title', label: 'Title' },
              { key: 'type', label: 'Type' },
            ].map(item => (
              <Pressable
                key={item.key}
                onPress={() => setSortBy(item.key as typeof sortBy)}
                style={[
                  styles.filterButton,
                  sortBy === item.key && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    sortBy === item.key && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Results */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {filteredAndSortedEvents.length} Event{filteredAndSortedEvents.length !== 1 ? 's' : ''}
            </Text>
            {filteredAndSortedEvents.length > 0 && (
              <Text style={styles.resultsSubtitle}>
                {searchText && `Matching "${searchText}"`}
              </Text>
            )}
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : filteredAndSortedEvents.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={filteredAndSortedEvents}
              keyExtractor={item => item.id}
              renderItem={({ item: event }) => (
                <Pressable
                  onPress={() => router.push(`/calendar/${event.id}`)}
                  style={styles.eventItem}
                >
                  <View style={[styles.eventItemColorBar, { backgroundColor: getEventColor(event.event_type) }]} />
                  <View style={styles.eventItemContent}>
                    <Text style={styles.eventItemTitle}>{event.title}</Text>
                    <Text style={styles.eventItemMeta}>
                      {formatDate(event.start_time)} {!event.all_day && `• ${formatTime(event.start_time)}`}
                    </Text>
                    {event.description && (
                      <Text style={styles.eventItemDescription} numberOfLines={2}>{event.description}</Text>
                    )}
                    <Text style={styles.eventItemType}>{event.event_type.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.eventItemArrow}>›</Text>
                </Pressable>
              )}
              ListFooterComponent={<View style={{ height: spacing.lg }} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📭</Text>
              <Text style={styles.emptyStateTitle}>No events found</Text>
              <Text style={styles.emptyStateText}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: 100 },
  header: { backgroundColor: colors.paper, paddingHorizontal: spacing.lg, paddingTop: 54, paddingBottom: spacing.lg },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.lg },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: spacing.md, gap: spacing.sm },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: spacing.md },
  clearButton: { color: colors.muted, fontSize: 16, fontWeight: '700' },

  filterSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.md },
  filterButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterButton: { backgroundColor: colors.paper, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.line },
  filterButtonActive: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  filterButtonText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  filterButtonTextActive: { color: colors.card },

  resultsSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  resultsHeader: { marginBottom: spacing.lg },
  resultsTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  resultsSubtitle: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },

  loadingText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginVertical: spacing.lg },

  eventItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, marginBottom: spacing.md, overflow: 'hidden' },
  eventItemColorBar: { width: 4, height: '100%' },
  eventItemContent: { flex: 1, padding: spacing.md },
  eventItemTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  eventItemMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  eventItemDescription: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  eventItemType: { color: colors.sageDark, fontSize: 11, fontWeight: '700', marginTop: spacing.xs, textTransform: 'capitalize' },
  eventItemArrow: { color: colors.muted, fontSize: 18, paddingRight: spacing.md },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyStateEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyStateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyStateText: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
});
