import { useState, useMemo } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { scheduleReminder } from '@/src/lib/notification-service';
import { colors, spacing } from '@/src/theme';

const DURATION_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hr', minutes: 120 },
  { label: '3 hr', minutes: 180 },
];

const REMINDER_OPTIONS = [
  { label: 'None', minutes: null },
  { label: '0 min', minutes: 0 },
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function CreateEventScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);

  // Date/Time picker state
  const [eventDate, setEventDate] = useState(new Date());
  const [eventHour, setEventHour] = useState(getNextHour());
  const [eventMinute, setEventMinute] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Helper: Get next full hour from now
  function getNextHour() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour.getHours();
  }

  // Format date for display
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format time for display
  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Get array of dates to display (today + next 30 days)
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    return dates;
  }, []);

  // Validate and create event
  const validateAndCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Enter event title');
      return;
    }

    if (!session) {
      Alert.alert('Error', 'Not signed in');
      return;
    }

    // Build start datetime from selected date and time
    const startDateTime = new Date(eventDate);
    startDateTime.setHours(eventHour, eventMinute, 0, 0);

    // Validate: event must be in future
    const now = new Date();
    if (startDateTime <= now) {
      Alert.alert('Error', 'Event must be in the future');
      return;
    }

    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    setSaving(true);

    try {
      // Insert event
      const { data: eventData, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: null,
          event_type: 'custom',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: false,
          location: null,
        })
        .select()
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('No event data returned');

      console.log('[CreateEvent] Event created:', {
        title: title.trim(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      // Create reminder if specified
      if (reminderMinutes !== null) {
        const reminderScheduledTime = new Date(startDateTime.getTime() - reminderMinutes * 60 * 1000);

        console.log('[CreateEvent] Creating and scheduling reminder:', {
          eventStart: startDateTime.toISOString(),
          minutesBefore: reminderMinutes,
          reminderTime: reminderScheduledTime.toISOString(),
          currentTime: now.toISOString(),
          inFuture: reminderScheduledTime > now,
        });

        // Insert reminder record
        const { data: reminderData, error: reminderError } = await supabase
          .from('event_reminders')
          .insert({
            user_id: session.user.id,
            event_id: eventData.id,
            title: `Reminder: ${title}`,
            minutes_before: reminderMinutes,
            notification_type: 'notification',
            scheduled_time: reminderScheduledTime.toISOString(),
            enabled: true,
          })
          .select()
          .single();

        if (reminderError) {
          console.warn('[CreateEvent] Reminder insertion failed:', reminderError);
          Alert.alert('Warning', 'Event created but reminder failed to save. Try adding reminder again.');
        } else if (reminderData) {
          // PHASE 1: Schedule immediately (don't wait for periodic scheduler)
          console.log('[CreateEvent] Reminder inserted, scheduling OS notification immediately...');
          const scheduleResult = await scheduleReminder(
            reminderData.id,
            title.trim(),
            reminderScheduledTime,
            eventData.id,
            reminderMinutes
          );

          if (scheduleResult.success) {
            console.log('[CreateEvent] ✓ Reminder successfully scheduled with notification ID:', scheduleResult.notificationId);
          } else {
            console.warn('[CreateEvent] ⚠️ Reminder could not be scheduled:', scheduleResult.error);
            // Don't fail the whole event creation, just warn
            Alert.alert('Info', `Event created. Reminder scheduling: ${scheduleResult.error}`);
          }
        }
      }

      Alert.alert('✓ Event created!');
      router.back();
    } catch (e) {
      console.error('[CreateEvent] Error:', e);
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>New Event</Text>

        {/* Title Input */}
        <View style={styles.mainSection}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            placeholder="Meeting, Workout..."
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
            autoFocus
            maxLength={100}
          />
        </View>

        {/* Date/Time Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Date & Time</Text>

          {/* Date Selector */}
          <View style={styles.dateTimeRow}>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>📅 {formatDate(eventDate)}</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowTimePicker(!showTimePicker)}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>🕐 {formatTime(eventHour, eventMinute)}</Text>
            </Pressable>
          </View>

          {/* Date Picker - Inline */}
          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                {dateOptions.map((date, i) => {
                  const isSelected = date.toDateString() === eventDate.toDateString();
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setEventDate(date);
                        setShowDatePicker(false);
                      }}
                      style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    >
                      <Text style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                        {formatDate(date)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Time Picker - Inline */}
          {showTimePicker && (
            <View style={styles.timePickerContainer}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Hour</Text>
                <ScrollView 
                  style={styles.timeScroll} 
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {HOURS.map(h => (
                    <Pressable
                      key={h}
                      onPress={() => setEventHour(h)}
                      style={[styles.timeOption, eventHour === h && styles.timeOptionSelected]}
                    >
                      <Text style={[styles.timeOptionText, eventHour === h && styles.timeOptionTextSelected]}>
                        {h.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Minute</Text>
                <ScrollView 
                  style={styles.timeScroll} 
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {MINUTES.map(m => (
                    <Pressable
                      key={m}
                      onPress={() => setEventMinute(m)}
                      style={[styles.timeOption, eventMinute === m && styles.timeOptionSelected]}
                    >
                      <Text style={[styles.timeOptionText, eventMinute === m && styles.timeOptionTextSelected]}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.optionsRow}>
            {DURATION_OPTIONS.map(option => (
              <Pressable
                key={option.minutes}
                onPress={() => setDurationMinutes(option.minutes)}
                style={[
                  styles.optionButton,
                  durationMinutes === option.minutes && styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    durationMinutes === option.minutes && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reminder */}
        <View style={styles.section}>
          <Text style={styles.label}>Reminder</Text>
          <View style={styles.optionsGrid}>
            {REMINDER_OPTIONS.map(option => (
              <Pressable
                key={String(option.minutes)}
                onPress={() => setReminderMinutes(option.minutes)}
                style={[
                  styles.gridButton,
                  reminderMinutes === option.minutes && styles.gridButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.gridText,
                    reminderMinutes === option.minutes && styles.gridTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.spacing} />
        <Pressable
          onPress={() => void validateAndCreate()}
          disabled={saving || !title.trim()}
          style={[
            styles.createButton,
            (saving || !title.trim()) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.createButtonText}>
            {saving ? 'Creating...' : '✓ Create Event'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.lg },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', marginBottom: spacing.xl },

  mainSection: { marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: spacing.md },

  titleInput: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
    padding: spacing.lg,
  },

  // Date/Time buttons
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pickerButton: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 1,
    alignItems: 'center',
  },
  pickerButtonText: { color: colors.ink, fontSize: 14, fontWeight: '600' },

  // Date picker inline
  pickerContainer: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.md,
    maxHeight: 250,
  },
  dateScroll: { maxHeight: 250 },
  dateOption: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  dateOptionSelected: { backgroundColor: colors.sageDark },
  dateOptionText: { color: colors.ink, fontSize: 14 },
  dateOptionTextSelected: { color: colors.card, fontWeight: '800' },

  // Time picker inline
  timePickerContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.md,
    height: 240,
    overflow: 'hidden',
  },
  timeColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  timeLabel: { textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', paddingVertical: spacing.sm },
  timeScroll: { flex: 1, minHeight: 200 },
  timeOption: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, height: 44 },
  timeOptionSelected: { backgroundColor: colors.coral },
  timeOptionText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  timeOptionTextSelected: { color: colors.card, fontWeight: '800' },

  // Duration options
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  optionButton: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.sageDark,
    borderColor: colors.sageDark,
  },
  optionText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: colors.card, fontWeight: '800' },

  // Reminder options grid
  optionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  gridButton: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  gridButtonActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  gridText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  gridTextActive: { color: colors.card, fontWeight: '800' },

  spacing: { height: spacing.lg },

  createButton: {
    backgroundColor: colors.sageDark,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  createButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' },

  cancelButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.muted, fontSize: 16, fontWeight: '700' },

  buttonDisabled: { opacity: 0.5 },
});
