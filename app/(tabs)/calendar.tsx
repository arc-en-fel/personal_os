import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  area_id: string | null;
};

type Reminder = {
  id: string;
  event_id: string;
  event_title: string;
  reminder_timing: string;
  notification_type: 'push' | 'in_app' | 'email' | 'sms';
  scheduled_time: string;
  enabled: boolean;
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NOTIFICATION_ICONS: Record<string, string> = {
  'in_app': '🔔',
  'push': '📱',
  'email': '📧',
  'sms': '💬',
};

export default function CalendarScreen() {
  const { session } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadEvents = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // Get events for the month being viewed
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time, all_day, color, area_id')
        .eq('user_id', session.user.id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.log('Calendar table unavailable (may not be created yet)');
        setEvents([]);
        return;
      }
      setEvents((data as CalendarEvent[]) || []);

      // Also load reminders
      const { data: eventData } = await supabase
        .from('calendar_events')
        .select('id, title')
        .eq('user_id', session.user.id);

      if (eventData) {
        const eventMap: Record<string, string> = {};
        eventData.forEach((e: any) => {
          eventMap[e.id] = e.title;
        });

        const { data: reminderData } = await supabase
          .from('event_reminders')
          .select('*')
          .in('event_id', eventData.map((e: any) => e.id));

        if (reminderData) {
          const enrichedReminders = reminderData.map((r: any) => ({
            ...r,
            event_title: eventMap[r.event_id] || 'Unknown Event'
          }));
          setReminders(enrichedReminders as Reminder[]);
        }
      }
    } catch (e) {
      console.log('Failed to load events:', e);
      setEvents([]);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [session, currentDate]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  // Calendar calculations
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(e => {
      const eventDate = new Date(e.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForSelectedDate = (): CalendarEvent[] => {
    return events.filter(e => {
      const eventDate = new Date(e.start_time);
      return eventDate.toDateString() === selectedDate.toDateString();
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const selectDate = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const selectedDateEvents = getEventsForSelectedDate();
  const isSelectedToday = selectedDate.toDateString() === today.toDateString();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <Text style={styles.kicker}>CALENDAR</Text>
      <Text style={styles.title}>Your Schedule</Text>
      <Text style={styles.subtitle}>See what's ahead and plan your day.</Text>

      {/* Create Button */}
      <Pressable
        onPress={() => router.push('/create-event')}
        style={styles.createButton}
      >
        <Text style={styles.createButtonText}>+ New Event</Text>
      </Pressable>

      {/* Month View */}
      <View style={styles.monthView}>
        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <Pressable onPress={prevMonth} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <View style={styles.monthTitle}>
            <Text style={styles.monthName}>{MONTHS[currentDate.getMonth()]}</Text>
            <Text style={styles.year}>{currentDate.getFullYear()}</Text>
          </View>
          <Pressable onPress={nextMonth} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>

        {/* Day of week headers */}
        <View style={styles.dayOfWeekRow}>
          {DAYS_OF_WEEK.map(day => (
            <Text key={day} style={styles.dayOfWeekHeader}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = day !== null && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
            const dayEvents = day ? getEventsForDay(day) : [];

            return (
              <Pressable
                key={index}
                onPress={() => day && selectDate(day)}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell
                ]}
              >
                {day ? (
                  <>
                    <Text
                      style={[
                        styles.dayNumber,
                        isToday && styles.todayNumber,
                        isSelected && styles.selectedNumber
                      ]}
                    >
                      {day}
                    </Text>
                    {dayEvents.length > 0 && (
                      <View style={styles.eventIndicators}>
                        {dayEvents.slice(0, 2).map((event, i) => (
                          <View
                            key={i}
                            style={[
                              styles.eventDot,
                              { backgroundColor: event.color || colors.sageDark }
                            ]}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <Text style={styles.moreIndicator}>+{dayEvents.length - 2}</Text>
                        )}
                      </View>
                    )}
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Day Schedule */}
      <View style={styles.dayScheduleSection}>
        <View style={styles.dayScheduleHeader}>
          <Text style={styles.dayScheduleDate}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          {isSelectedToday && <Text style={styles.todayBadge}>Today</Text>}
        </View>

        {selectedDateEvents.length > 0 ? (
          <View>
            {selectedDateEvents.map(event => {
              const startTime = new Date(event.start_time);
              const endTime = new Date(event.end_time);
              const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <Pressable
                  key={event.id}
                  onPress={() => router.push(`/calendar/${event.id}`)}
                  style={styles.eventRow}
                >
                  <View style={styles.eventTime}>
                    <Text style={styles.eventTimeText}>{timeStr}</Text>
                  </View>
                  <View style={[styles.eventCard, { borderLeftColor: event.color || colors.sageDark }]}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {!event.all_day && (
                      <Text style={styles.eventDuration}>
                        {timeStr} – {endTimeStr}
                      </Text>
                    )}
                    {event.all_day && <Text style={styles.eventAllDay}>All day</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No events scheduled</Text>
            <Text style={styles.emptyStateText}>Tap the + button to create an event</Text>
          </View>
        )}
      </View>

      {/* Upcoming Events Section */}
      <View style={styles.upcomingSection}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {events.length > 0 ? (
          <View>
            {events.slice(0, 5).map(event => {
              const eventDate = new Date(event.start_time);
              const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <Pressable
                  key={event.id}
                  onPress={() => router.push(`/calendar/${event.id}`)}
                  style={styles.upcomingEventCard}
                >
                  <View style={[styles.colorBar, { backgroundColor: event.color || colors.sageDark }]} />
                  <View style={styles.upcomingEventContent}>
                    <Text style={styles.upcomingEventTitle}>{event.title}</Text>
                    <Text style={styles.upcomingEventMeta}>{dateStr} at {timeStr}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No upcoming events</Text>
        )}
      </View>

      {/* Reminders Section */}
      <View style={styles.remindersSection}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        {reminders.length > 0 ? (
          <View>
            {reminders.slice(0, 5).map(reminder => {
              const isPast = new Date(reminder.scheduled_time) < new Date();
              const reminderDate = new Date(reminder.scheduled_time);
              const dateStr = reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <Pressable
                  key={reminder.id}
                  onPress={() => router.push(`/calendar/${reminder.event_id}`)}
                  style={[styles.reminderCard, isPast && styles.reminderCardPast]}
                >
                  <Text style={styles.notificationIcon}>{NOTIFICATION_ICONS[reminder.notification_type]}</Text>
                  <View style={styles.reminderContent}>
                    <Text style={[styles.reminderEventTitle, isPast && styles.textMuted]}>{reminder.event_title}</Text>
                    <Text style={styles.reminderTime}>{dateStr} at {timeStr}</Text>
                  </View>
                  {!reminder.enabled && <Text style={styles.disabledBadge}>Off</Text>}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No reminders</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 100 },

  // Header
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },
  
  // Create Button
  createButton: { backgroundColor: colors.sageDark, borderRadius: 12, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.lg, alignItems: 'center' },
  createButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' },

  // Month View
  monthView: { marginBottom: spacing.lg },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  navButton: { padding: spacing.sm },
  navArrow: { fontSize: 24, fontWeight: '800', color: colors.sageDark },
  monthTitle: { alignItems: 'center' },
  monthName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  year: { fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: 2 },

  // Day of week headers
  dayOfWeekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  dayOfWeekHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.muted },

  // Calendar grid
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayCell: { width: '14.28%', aspectRatio: 1, backgroundColor: colors.card, borderRadius: 10, padding: spacing.xs, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  todayCell: { borderColor: colors.sageDark, borderWidth: 2 },
  selectedCell: { backgroundColor: colors.sage, borderColor: colors.sageDark },
  dayNumber: { fontSize: 14, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  todayNumber: { color: colors.sageDark, fontWeight: '800' },
  selectedNumber: { color: colors.sageDark, fontWeight: '800' },
  eventIndicators: { flexDirection: 'row', gap: 2, marginTop: 2, alignItems: 'center' },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  moreIndicator: { fontSize: 8, fontWeight: '700', color: colors.muted },

  // Day Schedule
  dayScheduleSection: { marginBottom: spacing.lg },
  dayScheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  dayScheduleDate: { fontSize: 18, fontWeight: '800', color: colors.ink },
  todayBadge: { backgroundColor: colors.sageDark, color: colors.card, fontSize: 11, fontWeight: '800', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },

  // Event Row (time + card)
  eventRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  eventTime: { width: 50, paddingTop: 2 },
  eventTimeText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  eventCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, borderLeftWidth: 4, padding: spacing.md },
  eventTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  eventDuration: { fontSize: 12, color: colors.muted, marginTop: 4 },
  eventAllDay: { fontSize: 12, color: colors.muted, marginTop: 4, fontStyle: 'italic' },

  // Empty State
  emptyState: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, alignItems: 'center' },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  emptyStateText: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },

  // Upcoming Section
  upcomingSection: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  upcomingEventCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.sm },
  colorBar: { width: 4 },
  upcomingEventContent: { flex: 1, padding: spacing.md },
  upcomingEventTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  upcomingEventMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center', paddingVertical: spacing.lg },

  // Reminders Section
  remindersSection: { marginBottom: spacing.lg },
  reminderCard: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderCardPast: { opacity: 0.6 },
  reminderContent: { flex: 1 },
  reminderEventTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  reminderTime: { fontSize: 12, color: colors.muted, marginTop: 4 },
  notificationIcon: { fontSize: 18 },
  disabledBadge: { fontSize: 11, fontWeight: '800', color: colors.muted, backgroundColor: colors.line, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },
  textMuted: { color: colors.muted },
});
