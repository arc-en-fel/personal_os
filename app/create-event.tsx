import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

const REMINDER_OPTIONS = [
  { label: 'No reminder', minutes: null },
  { label: 'At time', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
];

export default function CreateEventScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState({ hours: 10, minutes: 0 });
  const [endTime, setEndTime] = useState({ hours: 11, minutes: 0 });
  const [allDay, setAllDay] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(30);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states for date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (hours: number, minutes: number) => {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const getReminderLabel = () => {
    if (reminderMinutes === null) return 'None';
    const option = REMINDER_OPTIONS.find(o => o.minutes === reminderMinutes);
    return option?.label || 'Custom';
  };

  const validateAndCreate = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title');
      return;
    }

    if (!allDay) {
      const startTotalMinutes = startTime.hours * 60 + startTime.minutes;
      const endTotalMinutes = endTime.hours * 60 + endTime.minutes;

      if (endTotalMinutes <= startTotalMinutes) {
        Alert.alert('Invalid Time', 'End time must be after start time');
        return;
      }
    }

    if (!session) {
      Alert.alert('Error', 'You must be signed in to create an event');
      return;
    }

    setSaving(true);

    try {
      // Create start/end datetimes
      let startDateTime, endDateTime;

      if (allDay) {
        // For all-day events, use midnight
        startDateTime = new Date(selectedDate);
        startDateTime.setHours(0, 0, 0, 0);
        
        endDateTime = new Date(selectedDate);
        endDateTime.setHours(23, 59, 59, 999);
      } else {
        startDateTime = new Date(selectedDate);
        startDateTime.setHours(startTime.hours, startTime.minutes, 0, 0);

        endDateTime = new Date(selectedDate);
        endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
      }

      // Insert event
      const { data: eventData, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: description.trim() || null,
          event_type: 'custom',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          all_day: allDay,
          location: location.trim() || null,
        })
        .select()
        .single();

      if (eventError) {
        if (eventError.code === 'PGRST205') {
          console.error('Missing calendar_events table:', eventError.message);
          throw new Error('Calendar tables not created. Set up database tables by running this SQL in Supabase:\n\nFile: supabase/migrations/20260905_setup_calendar_reminders.sql\n\nOr run: supabase db push');
        }
        throw eventError;
      }
      if (!eventData) throw new Error('No event data returned');

      // Create reminder if specified
      if (reminderMinutes !== null) {
        const reminderScheduledTime = new Date(startDateTime.getTime() - reminderMinutes * 60 * 1000);

        console.log(`[CreateEvent] Creating reminder:`);
        console.log(`  Event start: ${startDateTime.toISOString()}`);
        console.log(`  Minutes before: ${reminderMinutes}`);
        console.log(`  Reminder scheduled time: ${reminderScheduledTime.toISOString()}`);
        console.log(`  Current time: ${new Date().toISOString()}`);
        console.log(`  Reminder in future? ${reminderScheduledTime > new Date()}`);

        // DUPLICATE PREVENTION: Check if a reminder already exists for this event with same timing
        console.log(`[CreateEvent] Checking for duplicate reminders for event ${eventData.id}`);
        const { data: existingReminders, error: checkError } = await supabase
          .from('event_reminders')
          .select('id')
          .eq('event_id', eventData.id)
          .eq('minutes_before', reminderMinutes)
          .eq('notification_type', 'notification');

        if (checkError) {
          console.warn('[CreateEvent] Failed to check for duplicate reminders:', checkError);
        } else if (existingReminders && existingReminders.length > 0) {
          console.warn(`[CreateEvent] Duplicate reminder detected! Event already has ${existingReminders.length} reminder(s) with this timing`);
          Alert.alert('Warning', 'A reminder with this timing already exists for this event');
        } else {
          // No duplicates found - create the reminder
          console.log('[CreateEvent] No duplicates found - creating new reminder');
          const { error: reminderError } = await supabase
            .from('event_reminders')
            .insert({
              user_id: session.user.id,
              event_id: eventData.id,
              title: `Reminder: ${title}`,
              minutes_before: reminderMinutes,
              notification_type: 'notification',
              scheduled_time: reminderScheduledTime.toISOString(),
              enabled: true,
            });

          if (reminderError) {
            console.warn('[CreateEvent] Failed to create reminder:', reminderError);
            Alert.alert('Warning', 'Event created but reminder failed. You can add it later in event details.');
          } else {
            console.log('[CreateEvent] Reminder created successfully');
          }
        }
      }

      Alert.alert('Success', 'Event created!');
      router.replace(`/calendar/${eventData.id}`);
    } catch (e) {
      Alert.alert('Error', `Failed to create event: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Create Event</Text>

        {/* MAIN SECTION: Required Fields */}
        <View style={styles.mainSection}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              placeholder="Gym, Meeting, Study..."
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              autoFocus
              maxLength={100}
            />
          </View>

          {/* All-day toggle */}
          <Pressable
            onPress={() => setAllDay(!allDay)}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>All-day event</Text>
            <View style={[styles.checkbox, allDay && styles.checkboxActive]}>
              {allDay && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </Pressable>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date *</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>
                📅 {formatDate(selectedDate)}
              </Text>
            </Pressable>
          </View>

          {/* Start Time (hidden if all-day) */}
          {!allDay && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Starts at *</Text>
              <Pressable
                onPress={() => setShowStartTimePicker(true)}
                style={styles.pickerButton}
              >
                <Text style={styles.pickerButtonText}>
                  🕐 {formatTime(startTime.hours, startTime.minutes)}
                </Text>
              </Pressable>
            </View>
          )}

          {/* End Time (hidden if all-day) */}
          {!allDay && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Ends at</Text>
              <Pressable
                onPress={() => setShowEndTimePicker(true)}
                style={styles.pickerButton}
              >
                <Text style={styles.pickerButtonText}>
                  🕐 {formatTime(endTime.hours, endTime.minutes)}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Reminder */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Reminder</Text>
            <Pressable
              onPress={() => setShowReminderPicker(true)}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>
                🔔 {getReminderLabel()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Advanced Options */}
        <Pressable
          onPress={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedHeader}
        >
          <Text style={styles.advancedTitle}>
            {showAdvanced ? '▼' : '▶'} Additional Details
          </Text>
        </Pressable>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* Location */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                placeholder="Add location"
                placeholderTextColor={colors.muted}
                value={location}
                onChangeText={setLocation}
                style={styles.input}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                placeholder="Add notes or details"
                placeholderTextColor={colors.muted}
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.descriptionInput]}
                multiline
                maxLength={500}
              />
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, styles.cancelButton]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => void validateAndCreate()}
            disabled={saving || !title.trim()}
            style={[
              styles.button,
              styles.createButton,
              (saving || !title.trim()) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.createButtonText}>
              {saving ? 'Creating...' : 'Create Event'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* DATE PICKER MODAL */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Select Date</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={styles.datePickerScroll}>
                {Array.from({ length: 365 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  const isSelected = date.toDateString() === selectedDate.toDateString();

                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                      }}
                      style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    >
                      <Text
                        style={[
                          styles.dateOptionText,
                          isSelected && styles.dateOptionTextSelected,
                        ]}
                      >
                        {formatDate(date)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* START TIME PICKER MODAL */}
      {showStartTimePicker && (
        <Modal
          visible={showStartTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStartTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowStartTimePicker(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Start Time</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.timePickerContainer}>
                <View style={styles.timeColumnContainer}>
                  <Text style={styles.timePickerLabel}>Hours</Text>
                  <ScrollView style={styles.timePickerScroll}>
                    {Array.from({ length: 24 }).map((_,i) => (
                      <Pressable
                        key={i}
                        onPress={() => setStartTime({ ...startTime, hours: i })}
                        style={[
                          styles.timePickerOption,
                          startTime.hours === i && styles.timePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            startTime.hours === i && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timeColumnContainer}>
                  <Text style={styles.timePickerLabel}>Minutes</Text>
                  <ScrollView style={styles.timePickerScroll}>
                    {Array.from({ length: 60 }).map((_,i) => (
                      <Pressable
                        key={i}
                        onPress={() => setStartTime({ ...startTime, minutes: i })}
                        style={[
                          styles.timePickerOption,
                          startTime.minutes === i && styles.timePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            startTime.minutes === i && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Pressable
                onPress={() => setShowStartTimePicker(false)}
                style={styles.modalDoneButton}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* END TIME PICKER MODAL */}
      {showEndTimePicker && (
        <Modal
          visible={showEndTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEndTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowEndTimePicker(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
                <Text style={styles.modalTitle}>End Time</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.timePickerContainer}>
                <View style={styles.timeColumnContainer}>
                  <Text style={styles.timePickerLabel}>Hours</Text>
                  <ScrollView style={styles.timePickerScroll}>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setEndTime({ ...endTime, hours: i })}
                        style={[
                          styles.timePickerOption,
                          endTime.hours === i && styles.timePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            endTime.hours === i && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timeColumnContainer}>
                  <Text style={styles.timePickerLabel}>Minutes</Text>
                  <ScrollView style={styles.timePickerScroll}>
                    {Array.from({ length: 60 }).map((_, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setEndTime({ ...endTime, minutes: i })}
                        style={[
                          styles.timePickerOption,
                          endTime.minutes === i && styles.timePickerOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            endTime.minutes === i && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <Pressable
                onPress={() => setShowEndTimePicker(false)}
                style={styles.modalDoneButton}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* REMINDER PICKER MODAL */}
      {showReminderPicker && (
        <Modal
          visible={showReminderPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReminderPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowReminderPicker(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Reminder</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={styles.reminderPickerScroll}>
                {REMINDER_OPTIONS.map(option => (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      setReminderMinutes(option.minutes);
                      setShowReminderPicker(false);
                    }}
                    style={[
                      styles.reminderOption,
                      reminderMinutes === option.minutes && styles.reminderOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderOptionText,
                        reminderMinutes === option.minutes && styles.reminderOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {reminderMinutes === option.minutes && (
                      <Text style={styles.reminderCheckmark}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.lg },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginBottom: spacing.lg },

  // Main section
  mainSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: spacing.sm },
  titleInput: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 18, fontWeight: '600', padding: spacing.md },
  input: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 14, padding: spacing.md },
  descriptionInput: { minHeight: 80, textAlignVertical: 'top' },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, marginBottom: spacing.md },
  toggleLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  checkmark: { color: colors.card, fontSize: 16, fontWeight: '800' },

  // Picker buttons
  pickerButton: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 8, borderWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, alignItems: 'center' },
  pickerButtonText: { color: colors.ink, fontSize: 15, fontWeight: '600' },

  // Advanced section
  advancedHeader: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  advancedTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  advancedSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },

  // Buttons
  buttonGroup: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  button: { flex: 1, borderRadius: 8, paddingVertical: spacing.lg, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.card },
  cancelButtonText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  createButton: { backgroundColor: colors.sageDark },
  createButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalClose: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  modalDoneButton: { backgroundColor: colors.sageDark, padding: spacing.lg, alignItems: 'center', margin: spacing.lg, borderRadius: 8 },
  modalDoneButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' },

  // Date picker
  datePickerScroll: { maxHeight: 300 },
  dateOption: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  dateOptionSelected: { backgroundColor: colors.card },
  dateOptionText: { color: colors.ink, fontSize: 16 },
  dateOptionTextSelected: { color: colors.sageDark, fontWeight: '800' },

  // Time picker
  timePickerContainer: { flexDirection: 'row', height: 200 },
  timeColumnContainer: { flex: 1, borderRightWidth: 1, borderRightColor: colors.line },
  timePickerLabel: { textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '800', paddingVertical: spacing.sm },
  timePickerScroll: { flex: 1 },
  timePickerOption: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  timePickerOptionSelected: { backgroundColor: colors.card },
  timePickerOptionText: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  timePickerOptionTextSelected: { color: colors.sageDark, fontWeight: '800' },

  // Reminder picker
  reminderPickerScroll: { maxHeight: 300 },
  reminderOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  reminderOptionSelected: { backgroundColor: colors.card },
  reminderOptionText: { color: colors.ink, fontSize: 15 },
  reminderOptionTextSelected: { color: colors.sageDark, fontWeight: '800' },
  reminderCheckmark: { color: colors.sageDark, fontSize: 16, fontWeight: '800' },
});
