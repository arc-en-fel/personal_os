import { useCallback, useState, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
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

type ViewMode = 'month' | 'week' | 'day';

const HOUR_HEIGHT = 60; // Height of each hour in week/day view
const START_HOUR = 6; // Start time (6 AM)
const END_HOUR = 22; // End time (10 PM)

export default function CalendarScreen() {
  const { session } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // Sync calendar first
      await supabase.functions.invoke('sync-calendar', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      // Get events based on view mode
      let start, end;
      
      if (viewMode === 'week') {
        start = getWeekStart(currentDate);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (viewMode === 'day') {
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      } else {
        // Month view
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      }

      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      setEvents((data as CalendarEvent[] | null) ?? []);
    } catch (e) {
      console.error('Failed to load events:', e);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [session, currentDate, viewMode]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekDays = (startDate: Date): Date[] => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(e => {
      const eventDate = new Date(e.start_time);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const getEventsForDateRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
    return events.filter(e => {
      const eventStart = new Date(e.start_time);
      return eventStart >= startDate && eventStart <= endDate;
    });
  };

  const getEventsForWeekDay = (date: Date): CalendarEvent[] => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return getEventsForDateRange(dayStart, dayEnd);
  };

  const getDaysArray = (): (number | null)[] => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: (number | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatWeekRange = (startDate: Date): string => {
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

  const getEventPosition = (event: CalendarEvent): { top: number; height: number } => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;
    
    const top = (startHour - START_HOUR) * HOUR_HEIGHT;
    const height = Math.max((endHour - startHour) * HOUR_HEIGHT, HOUR_HEIGHT * 0.5);
    
    return { top: Math.max(0, top), height };
  };

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const days = getDaysArray();
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <View style={styles.headerWithButton}>
          <View>
            <Text style={styles.kicker}>CALENDAR</Text>
            <Text style={styles.title}>Stay organized</Text>
            <Text style={styles.subtitle}>View your reminders, goals, and study sessions in one place.</Text>
          </View>
          <Pressable onPress={() => router.push('/create-event')} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ Create</Text>
          </Pressable>
        </View>

        {/* View Mode Selector */}
        <View style={styles.viewModeSelector}>
          {(['month', 'week', 'day'] as const).map(mode => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
            >
              <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
            <Text style={styles.monthArrow}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
            <Text style={styles.monthArrow}>›</Text>
          </Pressable>
        </View>

        {viewMode === 'month' ? (
          <>
            {/* Month View */}
            <View style={styles.monthView}>
              {/* Day headers */}
              <View style={styles.dayHeaderRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Text key={day} style={styles.dayHeader}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {days.map((day, index) => (
                  <View key={index} style={styles.dayCell}>
                    {day ? (
                      <>
                        <View style={styles.dayNumber}>
                          <Text
                            style={[
                              styles.dayNumberText,
                              isCurrentMonth && day === today.getDate() && styles.dayNumberTextToday
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                        {getEventsForDay(day).length > 0 && (
                          <View style={styles.dayEventsDots}>
                            {getEventsForDay(day)
                              .slice(0, 3)
                              .map((event, i) => (
                                <View
                                  key={i}
                                  style={[styles.eventDot, { backgroundColor: getEventColor(event.event_type) }]}
                                />
                              ))}
                            {getEventsForDay(day).length > 3 && (
                              <Text style={styles.moreEvents}>+{getEventsForDay(day).length - 3}</Text>
                            )}
                          </View>
                        )}
                      </>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : viewMode === 'week' ? (
          <View style={styles.weekViewContainer}>
            <View style={styles.weekHeader}>
              <Pressable onPress={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))}>
                <Text style={styles.weekArrow}>‹</Text>
              </Pressable>
              <Text style={styles.weekTitle}>{formatWeekRange(weekStart)}</Text>
              <Pressable onPress={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))}>
                <Text style={styles.weekArrow}>›</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.weekGrid}>
                {/* Time column */}
                <View style={styles.timeColumn}>
                  <View style={{ height: 40 }} />
                  {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                    <View key={i} style={{ height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                      <Text style={styles.timeLabel}>{START_HOUR + i}:00</Text>
                    </View>
                  ))}
                </View>

                {/* Day columns */}
                {weekDays.map((date, dayIndex) => {
                  const dayEvents = getEventsForWeekDay(date);
                  const isToday = date.toDateString() === today.toDateString();
                  return (
                    <View key={dayIndex} style={styles.dayColumn}>
                      {/* Day header */}
                      <Pressable
                        onPress={() => setCurrentDate(date)}
                        style={[styles.dayColumnHeader, isToday && styles.dayColumnHeaderToday]}
                      >
                        <Text style={[styles.dayColumnDayName, isToday && styles.dayColumnDayNameToday]}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </Text>
                        <Text style={[styles.dayColumnDate, isToday && styles.dayColumnDateToday]}>
                          {date.getDate()}
                        </Text>
                      </Pressable>

                      {/* Time slots */}
                      <View style={styles.dayTimeSlots}>
                        {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                          <View key={i} style={[styles.timeSlot, { height: HOUR_HEIGHT }]} />
                        ))}

                        {/* Events */}
                        {dayEvents.map(event => {
                          const { top, height } = getEventPosition(event);
                          return (
                            <Pressable
                              key={event.id}
                              onPress={() => router.push(`/calendar/${event.id}`)}
                              style={[
                                styles.weekEvent,
                                { top, height, backgroundColor: getEventColor(event.event_type) }
                              ]}
                            >
                              <Text style={styles.weekEventTitle} numberOfLines={2}>{event.title}</Text>
                              <Text style={styles.weekEventTime}>{formatTime(event.start_time)}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.dayViewContainer}>
            <View style={styles.dayViewHeader}>
              <Pressable onPress={() => setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000))}>
                <Text style={styles.dayViewArrow}>‹</Text>
              </Pressable>
              <Text style={styles.dayViewTitle}>{formatDate(currentDate)}</Text>
              <Pressable onPress={() => setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000))}>
                <Text style={styles.dayViewArrow}>›</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.dayViewScroll}>
              <View style={styles.dayViewGrid}>
                {/* Time column with slots */}
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                  <View key={i} style={styles.dayViewTimeRow}>
                    <Text style={styles.dayViewTimeLabel}>{START_HOUR + i}:00</Text>
                    <View style={styles.dayViewSlot} />
                  </View>
                ))}

                {/* Events overlay */}
                <View style={styles.dayViewEventsContainer}>
                  {getEventsForWeekDay(currentDate).map(event => {
                    const { top } = getEventPosition(event);
                    return (
                      <Pressable
                        key={event.id}
                        onPress={() => router.push(`/calendar/${event.id}`)}
                        style={[
                          styles.dayViewEvent,
                          { top, backgroundColor: getEventColor(event.event_type) }
                        ]}
                      >
                        <Text style={styles.dayViewEventTitle}>{event.title}</Text>
                        <Text style={styles.dayViewEventTime}>
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </Text>
                        {event.description && (
                          <Text style={styles.dayViewEventDesc} numberOfLines={2}>{event.description}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* All-day events */}
            {getEventsForWeekDay(currentDate)
              .filter(e => e.all_day)
              .length > 0 && (
              <View style={styles.allDayEventsSection}>
                <Text style={styles.allDayTitle}>All Day</Text>
                {getEventsForWeekDay(currentDate)
                  .filter(e => e.all_day)
                  .map(event => (
                    <Pressable
                      key={event.id}
                      onPress={() => router.push(`/calendar/${event.id}`)}
                      style={[styles.allDayEvent, { borderLeftColor: getEventColor(event.event_type) }]}
                    >
                      <Text style={styles.allDayEventTitle}>{event.title}</Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Upcoming Events */}
        <Text style={styles.sectionTitle}>Upcoming Events</Text>

        {events.length > 0 ? (
          <View>
            {events.slice(0, 5).map(event => (
              <Pressable
                key={event.id}
                onPress={() => router.push(`/calendar/${event.id}`)}
                style={styles.eventCard}
              >
                <View style={[styles.eventColorBar, { backgroundColor: getEventColor(event.event_type) }]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {event.all_day ? 'All day' : formatTime(event.start_time)}
                  </Text>
                  <Text style={styles.eventType}>{event.event_type}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No upcoming events</Text>
            <Text style={styles.emptyText}>Create reminders or goals to see them here.</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable onPress={() => router.push('/calendar-suggestions')} style={[styles.actionButton, styles.suggestionsButton]}>
            <Text style={styles.suggestionsButtonText}>✨ Smart Suggestions</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/calendar-search')} style={[styles.actionButton, styles.searchButton]}>
            <Text style={styles.searchButtonText}>🔍 Search</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/calendar-settings')} style={[styles.actionButton, styles.settingsButton]}>
            <Text style={styles.settingsButtonText}>⚙</Text>
          </Pressable>
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

  viewModeSelector: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  viewModeButton: { flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing.md, alignItems: 'center' },
  viewModeButtonActive: { backgroundColor: colors.ink },
  viewModeText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  viewModeTextActive: { color: colors.card },

  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  monthArrow: { color: colors.sageDark, fontSize: 24, fontWeight: '800' },
  monthTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },

  monthView: { marginBottom: spacing.lg },
  dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dayHeader: { color: colors.muted, fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'center' },

  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayCell: { width: '14.28%', aspectRatio: 1, backgroundColor: colors.card, borderRadius: 8, padding: spacing.xs },
  dayNumber: { alignItems: 'center' },
  dayNumberText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  dayNumberTextToday: { color: colors.coral, fontWeight: '800' },
  dayEventsDots: { flexDirection: 'row', justifyContent: 'center', gap: 2, marginTop: spacing.xs },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  moreEvents: { color: colors.muted, fontSize: 8 },

  // Week View Styles
  weekViewContainer: { marginBottom: spacing.lg, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  weekTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  weekArrow: { color: colors.sageDark, fontSize: 20, fontWeight: '800', paddingHorizontal: spacing.md },

  weekGrid: { flexDirection: 'row', backgroundColor: colors.paper },
  timeColumn: { width: 50, backgroundColor: colors.card },
  timeLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', padding: 4 },

  dayColumn: { width: 110, borderRightWidth: 1, borderRightColor: colors.line },
  dayColumnHeader: { backgroundColor: colors.card, padding: spacing.sm, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  dayColumnHeaderToday: { backgroundColor: colors.coral },
  dayColumnDayName: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  dayColumnDayNameToday: { color: colors.card },
  dayColumnDate: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  dayColumnDateToday: { color: colors.card },

  dayTimeSlots: { position: 'relative' },
  timeSlot: { borderBottomWidth: 1, borderBottomColor: colors.line },
  weekEvent: { position: 'absolute', left: 4, right: 4, borderRadius: 6, padding: 4, marginVertical: 2 },
  weekEventTitle: { color: colors.card, fontSize: 10, fontWeight: '700' },
  weekEventTime: { color: colors.card, fontSize: 8, opacity: 0.9 },

  // Day View Styles
  dayViewContainer: { marginBottom: spacing.lg, backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', flex: 1 },
  dayViewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  dayViewTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  dayViewArrow: { color: colors.sageDark, fontSize: 20, fontWeight: '800', paddingHorizontal: spacing.md },

  dayViewScroll: { height: (END_HOUR - START_HOUR) * HOUR_HEIGHT },
  dayViewGrid: { position: 'relative' },
  dayViewTimeRow: { flexDirection: 'row', height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: colors.line },
  dayViewTimeLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', width: 50, paddingHorizontal: 4, paddingVertical: 2 },
  dayViewSlot: { flex: 1 },
  dayViewEventsContainer: { position: 'absolute', top: 0, left: 50, right: 0, height: (END_HOUR - START_HOUR) * HOUR_HEIGHT },
  dayViewEvent: { position: 'absolute', left: 4, right: 4, borderRadius: 6, padding: spacing.sm },
  dayViewEventTitle: { color: colors.card, fontSize: 12, fontWeight: '800' },
  dayViewEventTime: { color: colors.card, fontSize: 10, marginTop: 2 },
  dayViewEventDesc: { color: colors.card, fontSize: 9, marginTop: 4, opacity: 0.8 },

  allDayEventsSection: { backgroundColor: colors.card, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  allDayTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  allDayEvent: { borderLeftWidth: 3, paddingLeft: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  allDayEventTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },

  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: spacing.md, marginTop: spacing.lg },

  createButton: { backgroundColor: colors.sageDark, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8 },
  createButtonText: { color: colors.card, fontSize: 13, fontWeight: '800' },

  eventCard: { backgroundColor: colors.card, borderRadius: 12, marginBottom: spacing.sm, flexDirection: 'row', overflow: 'hidden' },
  eventColorBar: { width: 4 },
  eventContent: { flex: 1, padding: spacing.md },
  eventTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  eventTime: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  eventType: { color: colors.sageDark, fontSize: 11, fontWeight: '700', marginTop: spacing.xs },

  emptyState: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },

  buttonContainer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: spacing.lg, alignItems: 'center' },
  suggestionsButton: { backgroundColor: '#8B5CF6' },
  suggestionsButtonText: { color: colors.card, fontSize: 13, fontWeight: '800' },
  searchButton: { backgroundColor: colors.sageDark },
  searchButtonText: { color: colors.card, fontSize: 13, fontWeight: '800' },
  settingsButton: { flex: 0.6, backgroundColor: colors.ink },
  settingsButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' }
});
