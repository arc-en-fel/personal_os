/**
 * Week View Component with Drag-and-Drop Support
 * Extends calendar.tsx week view with event rescheduling via drag
 */

import { useCallback, useState, useMemo } from 'react';
import { Alert, PanResponder, View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';
import {
  handleEventDrop,
  undoLastDragOperation,
  DragOperationResult,
} from '@/src/lib/calendar-drag-service';
import { initializeDragState, startDrag, updateDragPosition, formatTimeDelta } from '@/src/lib/calendar-drag';

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 22;

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  is_synced_to_device?: boolean;
  device_calendar_id?: string | null;
};

export default function WeekViewDrag({
  weekStart,
  weekDays,
  events,
  onEventUpdate,
}: {
  weekStart: Date;
  weekDays: Date[];
  events: CalendarEvent[];
  onEventUpdate?: () => Promise<void>;
}) {
  const { session } = useAuth();
  const [dragState, setDragState] = useState(initializeDragState());
  const [draggedEventPreview, setDraggedEventPreview] = useState<{
    eventId: string;
    previewTime: Date;
  } | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [feedback, setFeedback] = useState<DragOperationResult | null>(null);

  const panResponders = useMemo(() => {
    const responders: Record<string, any> = {};

    events.forEach(event => {
      responders[event.id] = PanResponder.create({
        onStartShouldSetPanResponder: () => event.event_type !== 'custom', // Don't drag custom events
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt, { y0 }) => {
          setDragState(startDrag(event.id, event, y0));
        },
        onPanResponderMove: (evt, { moveY }) => {
          setDragState(prev => updateDragPosition(prev, moveY));
        },
        onPanResponderRelease: async (evt, { moveY }) => {
          if (!session || !dragState.dragStartY) return;

          setDragState(prev => ({ ...prev, isDragging: false }));

          try {
            const result = await handleEventDrop(
              session.user.id,
              event.id,
              dragState.dragStartY,
              moveY,
              events
            );

            setFeedback(result);

            if (result.success) {
              setUndoAvailable(true);
              // Refresh events
              if (onEventUpdate) {
                await onEventUpdate();
              }
            } else if (result.conflicts && result.conflicts.length > 0) {
              Alert.alert(
                'Time Conflict',
                `${result.message}\n\n${result.conflicts.map(c => c.title).join(', ')}`,
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Use Suggested Time',
                    onPress: () => {
                      if (result.suggestedTime && session) {
                        // TODO: Move to suggested time
                      }
                    },
                  },
                ]
              );
            }

            setDragState(initializeDragState());
            setDraggedEventPreview(null);
          } catch (e) {
            Alert.alert('Error', `Failed to reschedule event: ${String(e)}`);
            setDragState(initializeDragState());
          }
        },
      });
    });

    return responders;
  }, [events, session, dragState.dragStartY, onEventUpdate]);

  const handleUndo = async () => {
    if (!session) return;

    try {
      const result = await undoLastDragOperation(session.user.id);
      if (result.success) {
        setUndoAvailable(false);
        setFeedback(result);
        if (onEventUpdate) {
          await onEventUpdate();
        }
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to undo: ${String(e)}`);
    }
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

  const getEventsForWeekDay = (date: Date): CalendarEvent[] => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return events.filter(e => {
      const eventStart = new Date(e.start_time);
      return eventStart >= dayStart && eventStart <= dayEnd;
    });
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

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const today = new Date();
  const isCurrentWeek =
    weekStart <= today && today < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <View style={styles.container}>
      {/* Feedback Bar */}
      {feedback && (
        <View
          style={[
            styles.feedbackBar,
            feedback.success ? styles.feedbackSuccess : styles.feedbackError,
          ]}
        >
          <Text style={styles.feedbackText}>{feedback.message}</Text>
          {feedback.timeDelta && (
            <Text style={styles.feedbackDelta}>{feedback.timeDelta}</Text>
          )}
        </View>
      )}

      {/* Undo Button */}
      {undoAvailable && (
        <Pressable onPress={handleUndo} style={styles.undoButton}>
          <Text style={styles.undoButtonText}>↶ Undo Last Move</Text>
        </Pressable>
      )}

      {/* Week Grid */}
      <View style={styles.weekGrid}>
        {/* Time Column */}
        <View style={styles.timeColumn}>
          <View style={{ height: 40 }} />
          {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
            <View key={i} style={{ height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <Text style={styles.timeLabel}>{START_HOUR + i}:00</Text>
            </View>
          ))}
        </View>

        {/* Day Columns */}
        {weekDays.map((date, dayIndex) => {
          const dayEvents = getEventsForWeekDay(date);
          const isToday = date.toDateString() === today.toDateString();

          return (
            <View key={dayIndex} style={styles.dayColumn}>
              {/* Day Header */}
              <View style={[styles.dayColumnHeader, isToday && styles.dayColumnHeaderToday]}>
                <Text style={[styles.dayColumnDayName, isToday && styles.dayColumnDayNameToday]}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dayColumnDate, isToday && styles.dayColumnDateToday]}>
                  {date.getDate()}
                </Text>
              </View>

              {/* Time Slots */}
              <View style={styles.dayTimeSlots}>
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                  <View key={i} style={[styles.timeSlot, { height: HOUR_HEIGHT }]} />
                ))}

                {/* Events */}
                {dayEvents.map(event => {
                  const { top, height } = getEventPosition(event);
                  const isDragging = dragState.isDragging && dragState.draggedEventId === event.id;

                  return (
                    <Pressable
                      key={event.id}
                      {...(panResponders[event.id] ? panResponders[event.id].panHandlers : {})}
                      style={[
                        styles.weekEvent,
                        {
                          top,
                          height,
                          backgroundColor: getEventColor(event.event_type),
                          opacity: isDragging ? 0.6 : 1,
                          zIndex: isDragging ? 100 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.weekEventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <Text style={styles.weekEventTime}>{formatTime(event.start_time)}</Text>
                      {isDragging && (
                        <Text style={styles.weekEventDragging}>↕ Dragging</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Help Text */}
      <Text style={styles.helpText}>💡 Tip: Drag events to reschedule them. Conflicts will be detected automatically.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  feedbackBar: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  feedbackSuccess: { backgroundColor: '#D1FAE5' },
  feedbackError: { backgroundColor: '#FEE2E2' },
  feedbackText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  feedbackDelta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },

  undoButton: { marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.sageDark, borderRadius: 8, paddingVertical: spacing.md, alignItems: 'center' },
  undoButtonText: { color: colors.card, fontSize: 13, fontWeight: '800' },

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
  weekEventDragging: { color: colors.card, fontSize: 8, fontWeight: '700', marginTop: 2 },

  helpText: { color: colors.muted, fontSize: 11, textAlign: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
