import { useCallback, useState, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
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

type SchedulingSuggestion = {
  id: string;
  type: 'focus_time' | 'break_time' | 'study_opportunity' | 'consolidation' | 'balance';
  title: string;
  description: string;
  recommendedTime: string;
  duration: number; // minutes
  reason: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
};

type TimeSlot = {
  hour: number;
  minute: number;
  available: boolean;
  eventCount: number;
};

export default function CalendarSuggestionsScreen() {
  const { session } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadEventsAndGenerateSuggestions = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // Sync calendar first
      await supabase.functions.invoke('sync-calendar', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      // Get events for the next 30 days
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', now.toISOString())
        .lte('start_time', thirtyDaysLater.toISOString())
        .order('start_time', { ascending: true });

      const eventsData = (data as CalendarEvent[] | null) ?? [];
      setEvents(eventsData);

      // Generate suggestions
      setAnalyzing(true);
      const generatedSuggestions = generateSchedulingSuggestions(eventsData, now);
      setSuggestions(generatedSuggestions);
      setAnalyzing(false);
    } catch (e) {
      console.error('Failed to load events:', e);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadEventsAndGenerateSuggestions();
    }, [loadEventsAndGenerateSuggestions])
  );

  const generateSchedulingSuggestions = (eventsData: CalendarEvent[], startDate: Date): SchedulingSuggestion[] => {
    const newSuggestions: SchedulingSuggestion[] = [];
    const nextDate = new Date(startDate);

    // Analyze daily patterns
    const dailyEventCounts: Record<string, number> = {};
    const dailyEventTypes: Record<string, string[]> = {};
    const hourlyEventCounts: Record<number, number> = {};

    eventsData.forEach(event => {
      const eventDate = new Date(event.start_time);
      const dateKey = eventDate.toISOString().split('T')[0];
      const hour = eventDate.getHours();

      dailyEventCounts[dateKey] = (dailyEventCounts[dateKey] || 0) + 1;
      dailyEventTypes[dateKey] = [...(dailyEventTypes[dateKey] || []), event.event_type];
      hourlyEventCounts[hour] = (hourlyEventCounts[hour] || 0) + 1;
    });

    // Find average daily load
    const avgDailyEvents = Object.values(dailyEventCounts).reduce((a, b) => a + b, 0) / Math.max(Object.keys(dailyEventCounts).length, 1);

    // Suggestion 1: Focus Time Recommendation
    const leastBusyHour = Object.entries(hourlyEventCounts)
      .filter(([hour]) => parseInt(hour) >= 9 && parseInt(hour) <= 17)
      .sort(([, a], [, b]) => a - b)[0];

    if (leastBusyHour) {
      const [hour] = leastBusyHour;
      const hourNum = parseInt(hour);
      newSuggestions.push({
        id: 'focus-time-' + hourNum,
        type: 'focus_time',
        title: `Focus Time: ${formatHour(hourNum)}`,
        description: 'Block this time for deep work and concentration',
        recommendedTime: `${hourNum.toString().padStart(2, '0')}:00`,
        duration: 90,
        reason: `This is your least busy hour. Ideal for focused work on goals and study sessions.`,
        priority: 'high',
        actionable: true,
      });
    }

    // Suggestion 2: Break Time Recommendation
    if (avgDailyEvents > 5) {
      newSuggestions.push({
        id: 'break-time',
        type: 'break_time',
        title: 'Schedule Regular Breaks',
        description: `You have ${Math.round(avgDailyEvents)} events per day on average`,
        recommendedTime: '12:00',
        duration: 30,
        reason: 'High event density detected. Consider scheduling 30-minute breaks every 2 hours to maintain focus and avoid burnout.',
        priority: 'high',
        actionable: true,
      });
    }

    // Suggestion 3: Study Session Opportunity
    const studySessions = eventsData.filter(e => e.event_type === 'study_session');
    if (studySessions.length > 0) {
      const studyHours = studySessions
        .map(s => new Date(s.start_time).getHours())
        .reduce((sum, h) => sum + h, 0) / studySessions.length;

      newSuggestions.push({
        id: 'study-opportunity',
        type: 'study_opportunity',
        title: 'Optimal Study Time',
        description: 'Based on your study patterns',
        recommendedTime: `${Math.round(studyHours).toString().padStart(2, '0')}:00`,
        duration: 60,
        reason: `Your average study session starts at ${formatHour(Math.round(studyHours))}. This appears to be your optimal learning time.`,
        priority: 'medium',
        actionable: true,
      });
    }

    // Suggestion 4: Consolidation Time
    const reminderCount = eventsData.filter(e => e.event_type === 'reminder').length;
    if (reminderCount > 10) {
      newSuggestions.push({
        id: 'consolidation',
        type: 'consolidation',
        title: 'Review & Consolidation Time',
        description: `You have ${reminderCount} reminders in the next 30 days`,
        recommendedTime: '18:00',
        duration: 45,
        reason: 'High number of reminders. Schedule a weekly consolidation session to review progress and update priorities.',
        priority: 'medium',
        actionable: true,
      });
    }

    // Suggestion 5: Work-Life Balance
    const morningEvents = eventsData.filter(e => {
      const hour = new Date(e.start_time).getHours();
      return hour >= 6 && hour < 12;
    }).length;

    const eveningEvents = eventsData.filter(e => {
      const hour = new Date(e.start_time).getHours();
      return hour >= 18 && hour <= 23;
    }).length;

    if (eveningEvents > morningEvents * 2 || morningEvents > eveningEvents * 2) {
      const imbalanced = eveningEvents > morningEvents;
      newSuggestions.push({
        id: 'balance',
        type: 'balance',
        title: 'Balance Your Schedule',
        description: `${imbalanced ? 'Heavily evening-focused' : 'Heavily morning-focused'}`,
        recommendedTime: imbalanced ? '07:00' : '19:00',
        duration: 60,
        reason: `Your schedule is ${imbalanced ? 'evening-heavy' : 'morning-heavy'}. Consider balancing activities across the day for better productivity and well-being.`,
        priority: 'low',
        actionable: true,
      });
    }

    // Sort by priority
    return newSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return colors.coral;
      case 'medium':
        return colors.sageDark;
      case 'low':
        return colors.muted;
      default:
        return colors.ink;
    }
  };

  const getSuggestionIcon = (type: string): string => {
    switch (type) {
      case 'focus_time':
        return '🎯';
      case 'break_time':
        return '☕';
      case 'study_opportunity':
        return '📚';
      case 'consolidation':
        return '📋';
      case 'balance':
        return '⚖️';
      default:
        return '💡';
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.sageDark} />
          <Text style={styles.loadingText}>Analyzing your schedule...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>CALENDAR</Text>
        <Text style={styles.title}>Smart Suggestions</Text>
        <Text style={styles.subtitle}>AI-powered scheduling recommendations for optimal productivity.</Text>

        {/* Summary Stats */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Events</Text>
            <Text style={styles.summaryValue}>{events.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Next 30 Days</Text>
            <Text style={styles.summaryValue}>{Math.round(events.length / 30)}⌀/day</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Suggestions</Text>
            <Text style={styles.summaryValue}>{suggestions.length}</Text>
          </View>
        </View>

        {/* Suggestions */}
        <Text style={styles.sectionTitle}>Recommendations</Text>

        {suggestions.length > 0 ? (
          <View>
            {suggestions.map(suggestion => (
              <View key={suggestion.id} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionIcon}>{getSuggestionIcon(suggestion.type)}</Text>
                  <View style={styles.suggestionHeaderContent}>
                    <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                    <Text style={styles.suggestionTime}>
                      {suggestion.recommendedTime} • {suggestion.duration} min
                    </Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(suggestion.priority) }]}>
                    <Text style={styles.priorityBadgeText}>{suggestion.priority}</Text>
                  </View>
                </View>

                <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>

                {suggestion.actionable && (
                  <Pressable
                    onPress={() => {
                      router.push('/capture');
                    }}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>+ Add to Calendar</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Your schedule looks great!</Text>
            <Text style={styles.emptyText}>
              No optimization suggestions at the moment. Keep up the good scheduling.
            </Text>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Productivity Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Block focus time at your most productive hours</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Take breaks every 90 minutes for optimal focus</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Group similar tasks to minimize context switching</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Review and adjust your schedule weekly</Text>
          </View>
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

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  loadingText: { color: colors.muted, fontSize: 14, marginTop: spacing.lg },

  summaryBox: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: 12, paddingVertical: spacing.lg, marginBottom: spacing.lg },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryDivider: { width: 1, backgroundColor: colors.line },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: spacing.xs },

  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },

  suggestionCard: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  suggestionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, gap: spacing.md },
  suggestionIcon: { fontSize: 28 },
  suggestionHeaderContent: { flex: 1 },
  suggestionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  suggestionTime: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  priorityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6 },
  priorityBadgeText: { color: colors.card, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },

  suggestionDescription: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  suggestionReason: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },

  actionButton: { backgroundColor: colors.sageDark, borderRadius: 8, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  actionButtonText: { color: colors.card, fontSize: 13, fontWeight: '800' },

  emptyState: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },

  tipsSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginTop: spacing.lg },
  tipsTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.md },
  tipItem: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm },
  tipBullet: { color: colors.sageDark, fontSize: 14, fontWeight: '800' },
  tipText: { color: colors.muted, fontSize: 12, flex: 1, lineHeight: 18 },
});
