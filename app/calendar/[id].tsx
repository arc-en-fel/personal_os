import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { scheduleReminder, cancelAllRemindersForEvent } from '@/src/lib/notification-service';
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
  location: string | null;
  recurrence_rule: string | null;
  is_recurring: boolean;
};

type Reminder = {
  id: string;
  minutes_before: number;
  notification_type: 'email' | 'notification';
  notification_id: string | null;
  notification_id_scheduled_at: string | null;
};

const REMINDER_OPTIONS = [
  { label: 'No reminder', minutes: null },
  { label: '5 minutes before', minutes: 5 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
];

const REPEAT_OPTIONS = [
  { label: 'Does not repeat', value: null },
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function CalendarEventScreen() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [selectedReminderMinutes, setSelectedReminderMinutes] = useState(15);
  const [selectedNotificationType, setSelectedNotificationType] = useState<'email' | 'notification'>('notification');

  // Edit form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editStartHour, setEditStartHour] = useState(0);
  const [editStartMinute, setEditStartMinute] = useState(0);
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editEndHour, setEditEndHour] = useState(1);
  const [editEndMinute, setEditEndMinute] = useState(0);
  const [editReminderMinutes, setEditReminderMinutes] = useState<number | null>(null);
  const [editRepeat, setEditRepeat] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);

  const loadEvent = useCallback(async () => {
    if (!session || !id) return;
    setLoading(true);

    try {
      const [eventRes, remindersRes] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('id', id)
          .eq('user_id', session.user.id)
          .single(),
        supabase
          .from('event_reminders')
          .select('*')
          .eq('event_id', id)
          .order('minutes_before', { ascending: true })
      ]);

      if (eventRes.data) {
        const eventData = eventRes.data as CalendarEvent;
        setEvent(eventData);
        
        // Populate all edit fields
        setTitle(eventData.title);
        setDescription(eventData.description || '');
        setLocation(eventData.location || '');

        const startTime = new Date(eventData.start_time);
        setEditStartDate(new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate()));
        setEditStartHour(startTime.getHours());
        setEditStartMinute(startTime.getMinutes());

        const endTime = new Date(eventData.end_time);
        setEditEndDate(new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate()));
        setEditEndHour(endTime.getHours());
        setEditEndMinute(endTime.getMinutes());

        setEditRepeat(eventData.recurrence_rule?.split(';')[0].split('=')[1] || null);

        // Set first reminder as selected (if any)
        if (remindersRes.data && remindersRes.data.length > 0) {
          setEditReminderMinutes(remindersRes.data[0].minutes_before);
        }
      }

      if (remindersRes.data) {
        setReminders(remindersRes.data as Reminder[]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load event: ' + String(e));
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  useState(() => {
    void loadEvent();
  });

  const saveChanges = async () => {
    if (!session || !event) return;
    setSaving(true);

    try {
      // Build new datetime objects
      const newStartTime = new Date(editStartDate);
      newStartTime.setHours(editStartHour, editStartMinute, 0, 0);

      const newEndTime = new Date(editEndDate);
      newEndTime.setHours(editEndHour, editEndMinute, 0, 0);

      // Validate
      if (newEndTime <= newStartTime) {
        Alert.alert('Error', 'End time must be after start time');
        setSaving(false);
        return;
      }

      const oldStartTime = new Date(event.start_time);
      const oldEndTime = new Date(event.end_time);

      // Detect if reminder-related fields changed
      const timeChanged = newStartTime.getTime() !== oldStartTime.getTime() || newEndTime.getTime() !== oldEndTime.getTime();
      const reminderChanged = editReminderMinutes !== (reminders[0]?.minutes_before || null);
      const needsReminderUpdate = timeChanged || reminderChanged;

      console.log('[EventDetail] Saving event:', {
        titleChanged: title !== event.title,
        timeChanged,
        reminderChanged,
        needsReminderUpdate,
      });

      // Build recurrence rule
      let recurrenceRule = null;
      if (editRepeat) {
        recurrenceRule = `FREQ=${editRepeat}`;
      }

      // Update event
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          recurrence_rule: recurrenceRule,
          is_recurring: editRepeat !== null,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      console.log('[EventDetail] Event updated successfully');

      // Handle reminder changes if needed
      if (needsReminderUpdate) {
        const existingReminder = reminders[0];

        if (editReminderMinutes === null) {
          // Remove reminder if exists
          if (existingReminder) {
            console.log('[EventDetail] Cancelling existing reminder...');
            if (existingReminder.notification_id) {
              const Notifications = await import('expo-notifications');
              try {
                await Notifications.cancelScheduledNotificationAsync(existingReminder.notification_id);
                console.log('[EventDetail] ✓ OS notification cancelled');
              } catch (e) {
                console.warn('[EventDetail] Failed to cancel OS notification:', e);
              }
            }

            // Delete from DB
            const { error: deleteError } = await supabase
              .from('event_reminders')
              .delete()
              .eq('id', existingReminder.id);

            if (deleteError) throw deleteError;
            setReminders([]);
          }
        } else {
          // Update or create reminder
          const newReminderScheduledTime = new Date(newStartTime.getTime() - editReminderMinutes * 60 * 1000);

          if (existingReminder) {
            // Cancel old notification
            if (existingReminder.notification_id) {
              console.log('[EventDetail] Cancelling old notification:', existingReminder.notification_id);
              const Notifications = await import('expo-notifications');
              try {
                await Notifications.cancelScheduledNotificationAsync(existingReminder.notification_id);
                console.log('[EventDetail] ✓ Old notification cancelled');
              } catch (e) {
                console.warn('[EventDetail] Failed to cancel old notification:', e);
              }
            }

            // Update reminder
            const { error: updateReminderError } = await supabase
              .from('event_reminders')
              .update({
                minutes_before: editReminderMinutes,
                scheduled_time: newReminderScheduledTime.toISOString(),
                notification_id: null,
                notification_id_scheduled_at: null,
              })
              .eq('id', existingReminder.id);

            if (updateReminderError) throw updateReminderError;
          } else {
            // Create new reminder
            const { data: newReminderData, error: insertError } = await supabase
              .from('event_reminders')
              .insert({
                user_id: session.user.id,
                event_id: event.id,
                minutes_before: editReminderMinutes,
                notification_type: 'notification',
                title: `Reminder: ${title}`,
                scheduled_time: newReminderScheduledTime.toISOString(),
                enabled: true,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            setReminders(newReminderData ? [newReminderData as Reminder] : []);
          }

          // Schedule new notification
          const reminderToSchedule = existingReminder ? 
            { ...existingReminder, minutes_before: editReminderMinutes } : 
            reminders[0];

          console.log('[EventDetail] Scheduling new reminder...');
          const scheduleResult = await scheduleReminder(
            existingReminder?.id || (reminders[0]?.id || ''),
            title.trim(),
            newReminderScheduledTime,
            event.id,
            editReminderMinutes
          );

          if (!scheduleResult.success) {
            console.warn('[EventDetail] ⚠️ Failed to schedule reminder:', scheduleResult.error);
            Alert.alert('Warning', 'Event updated but reminder could not be scheduled. Please try again.');
          } else {
            console.log('[EventDetail] ✓ Reminder scheduled successfully');
          }
        }
      }

      Alert.alert('Success', 'Event updated');
      setEditing(false);
      await loadEvent();
    } catch (e) {
      console.error('[EventDetail] Save error:', e);
      Alert.alert('Error', 'Failed to save changes: ' + String(e));
    } finally {
      setSaving(false);
    }
  };

  const addReminder = async () => {
    if (!event) return;

    try {
      // Check if this reminder already exists
      const exists = reminders.some(
        r => r.minutes_before === selectedReminderMinutes && r.notification_type === selectedNotificationType
      );

      if (exists) {
        Alert.alert('Error', 'This reminder already exists for this event');
        return;
      }

      const reminderScheduledTime = new Date(new Date(event.start_time).getTime() - selectedReminderMinutes * 60000);

      // Insert reminder record
      const { data, error } = await supabase
        .from('event_reminders')
        .insert({
          user_id: session!.user.id,
          event_id: event.id,
          minutes_before: selectedReminderMinutes,
          notification_type: selectedNotificationType,
          title: `Reminder: ${event.title}`,
          scheduled_time: reminderScheduledTime.toISOString(),
          enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      // PHASE 1: Schedule immediately
      console.log('[EventDetail] Reminder inserted, scheduling OS notification immediately...');
      const scheduleResult = await scheduleReminder(
        data.id,
        event.title,
        reminderScheduledTime,
        event.id,
        selectedReminderMinutes
      );

      if (scheduleResult.success) {
        console.log('[EventDetail] ✓ Reminder scheduled with notification ID:', scheduleResult.notificationId);
      } else {
        console.warn('[EventDetail] ⚠️ Reminder could not be scheduled:', scheduleResult.error);
      }

      setReminders([...reminders, data as Reminder]);
      setShowAddReminder(false);
      Alert.alert('Success', 'Reminder added');
    } catch (e) {
      Alert.alert('Error', 'Failed to add reminder: ' + String(e));
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      // Get the reminder's notification ID
      const reminder = reminders.find(r => r.id === reminderId);
      
      if (reminder?.notification_id) {
        console.log('[EventDetail] Cancelling OS notification:', reminder.notification_id);
        
        // Import here to avoid circular dependency
        const Notifications = await import('expo-notifications');
        try {
          await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          console.log('[EventDetail] ✓ OS notification cancelled');
        } catch (e) {
          console.warn('[EventDetail] Failed to cancel OS notification:', e);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('event_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      setReminders(reminders.filter(r => r.id !== reminderId));
      Alert.alert('Success', 'Reminder deleted');
    } catch (e) {
      Alert.alert('Error', 'Failed to delete reminder: ' + String(e));
    }
  };

  const deleteEvent = async () => {
    if (!session || !event) return;

    Alert.alert('Delete Event?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Cancel all reminders for this event
            console.log('[EventDetail] Cancelling all reminders for event:', event.id);
            await cancelAllRemindersForEvent(event.id);

            // Delete the event
            const { error } = await supabase.from('calendar_events').delete().eq('id', event.id);
            if (error) throw error;

            Alert.alert('Success', 'Event deleted');
            router.back();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete event: ' + String(e));
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  if (editing) {
    const formatDate = (date: Date) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (hour: number, minute: number) => {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    const dateOptions = (() => {
      const dates = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
      }
      return dates;
    })();

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setEditing(false)}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>

          <Text style={styles.title}>Edit Event</Text>

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            placeholder="Event title"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Optional details"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.noteInput]}
            multiline
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <TextInput
            placeholder="Optional location"
            placeholderTextColor={colors.muted}
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />

          {/* Date & Time */}
          <Text style={styles.label}>Start Date & Time</Text>
          <View style={styles.dateTimeRow}>
            <Pressable
              onPress={() => setShowDatePicker(showDatePicker === 'start' ? null : 'start')}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>📅 {formatDate(editStartDate)}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(showTimePicker === 'start' ? null : 'start')}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>🕐 {formatTime(editStartHour, editStartMinute)}</Text>
            </Pressable>
          </View>

          {showDatePicker === 'start' && (
            <View style={styles.pickerContainer}>
              <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                {dateOptions.map((date, i) => {
                  const isSelected = date.toDateString() === editStartDate.toDateString();
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setEditStartDate(date);
                        setShowDatePicker(null);
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

          {showTimePicker === 'start' && (
            <View style={styles.timePickerContainer}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Hour</Text>
                <ScrollView style={styles.timeScroll} scrollEventThrottle={16} nestedScrollEnabled={true}>
                  {HOURS.map(h => (
                    <Pressable
                      key={h}
                      onPress={() => setEditStartHour(h)}
                      style={[styles.timeOption, editStartHour === h && styles.timeOptionSelected]}
                    >
                      <Text style={[styles.timeOptionText, editStartHour === h && styles.timeOptionTextSelected]}>
                        {h.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Minute</Text>
                <ScrollView style={styles.timeScroll} scrollEventThrottle={16} nestedScrollEnabled={true}>
                  {MINUTES.map(m => (
                    <Pressable
                      key={m}
                      onPress={() => setEditStartMinute(m)}
                      style={[styles.timeOption, editStartMinute === m && styles.timeOptionSelected]}
                    >
                      <Text style={[styles.timeOptionText, editStartMinute === m && styles.timeOptionTextSelected]}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* End Date & Time */}
          <Text style={styles.label}>End Date & Time</Text>
          <View style={styles.dateTimeRow}>
            <Pressable
              onPress={() => setShowDatePicker(showDatePicker === 'end' ? null : 'end')}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>📅 {formatDate(editEndDate)}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(showTimePicker === 'end' ? null : 'end')}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>🕐 {formatTime(editEndHour, editEndMinute)}</Text>
            </Pressable>
          </View>

          {showDatePicker === 'end' && (
            <View style={styles.pickerContainer}>
              <ScrollView style={styles.dateScroll} showsVerticalScrollIndicator={false}>
                {dateOptions.map((date, i) => {
                  const isSelected = date.toDateString() === editEndDate.toDateString();
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setEditEndDate(date);
                        setShowDatePicker(null);
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

          {showTimePicker === 'end' && (
            <View style={styles.timePickerContainer}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Hour</Text>
                <ScrollView style={styles.timeScroll} scrollEventThrottle={16} nestedScrollEnabled={true}>
                  {HOURS.map(h => (
                    <Pressable
                      key={h}
                      onPress={() => setEditEndHour(h)}
                      style={[styles.timeOption, editEndHour === h && styles.timeOptionSelected]}
                    >
                      <Text style={[styles.timeOptionText, editEndHour === h && styles.timeOptionTextSelected]}>
                        {h.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Minute</Text>
                <ScrollView style={styles.timeScroll} scrollEventThrottle={16} nestedScrollEnabled={true}>
                  {MINUTES.map(m => (
                    <Pressable
                      key={m}
                      onPress={() => setEditEndMinute(m)}
                      style={[styles.timeOption, editEndMinute === m && styles.timeOptionSelected]}
                    >
                      <Text style={[styles.timeOptionText, editEndMinute === m && styles.timeOptionTextSelected]}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Reminder */}
          <Text style={styles.label}>Reminder</Text>
          <View style={styles.reminderOptions}>
            {REMINDER_OPTIONS.map(option => (
              <Pressable
                key={String(option.minutes)}
                onPress={() => setEditReminderMinutes(option.minutes)}
                style={[
                  styles.reminderButton,
                  editReminderMinutes === option.minutes && styles.reminderButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.reminderButtonText,
                    editReminderMinutes === option.minutes && styles.reminderButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Repeat */}
          <Text style={styles.label}>Repeat</Text>
          <View style={styles.repeatOptions}>
            {REPEAT_OPTIONS.map(option => (
              <Pressable
                key={String(option.value)}
                onPress={() => setEditRepeat(option.value)}
                style={[
                  styles.repeatButton,
                  editRepeat === option.value && styles.repeatButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.repeatButtonText,
                    editRepeat === option.value && styles.repeatButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.buttonGroup}>
            <Pressable onPress={() => setEditing(false)} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void saveChanges()}
              disabled={saving}
              style={[styles.button, styles.saveButton, saving && styles.disabled]}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <View style={styles.eventHeader}>
          <View style={[styles.colorBar, { backgroundColor: event.color }]} />
          <View style={styles.headerContent}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventType}>{event.event_type}</Text>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start</Text>
            <Text style={styles.detailValue}>{new Date(event.start_time).toLocaleString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End</Text>
            <Text style={styles.detailValue}>{new Date(event.end_time).toLocaleString()}</Text>
          </View>

          {event.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{event.location}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        {/* Reminders Section - Like Google Calendar */}
        <View style={styles.remindersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          {reminders.length > 0 ? (
            <View>
              {reminders.map(reminder => {
                const reminderLabel = REMINDER_OPTIONS.find(r => r.minutes === reminder.minutes_before)?.label || 
                  `${reminder.minutes_before} minutes before`;
                const icon = reminder.notification_type === 'email' ? '📧' : '🔔';
                
                return (
                  <View key={reminder.id} style={styles.reminderRow}>
                    <View style={styles.reminderContent}>
                      <Text style={styles.reminderText}>{icon} {reminderLabel}</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        Alert.alert('Delete?', '', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => void deleteReminder(reminder.id)
                          }
                        ]);
                      }}
                      style={styles.deleteReminderButton}
                    >
                      <Text style={styles.deleteReminderText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}
              
              <Pressable onPress={() => setShowAddReminder(true)} style={styles.addReminderButton}>
                <Text style={styles.addReminderText}>+ Add notification</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowAddReminder(true)} style={styles.addReminderButton}>
              <Text style={styles.addReminderText}>+ Add notification</Text>
            </Pressable>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Pressable onPress={() => setEditing(true)} style={[styles.actionButton, styles.editButton]}>
            <Text style={styles.editButtonText}>✎ Edit</Text>
          </Pressable>

          <Pressable onPress={() => void deleteEvent()} style={[styles.actionButton, styles.deleteButton]}>
            <Text style={styles.deleteButtonText}>🗑 Delete</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal visible={showAddReminder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowAddReminder(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Add notification</Text>
              <Text style={styles.modalPlaceholder}> </Text>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>When to notify</Text>
              {REMINDER_OPTIONS.map(option => (
                <Pressable
                  key={option.minutes}
                  onPress={() => setSelectedReminderMinutes(option.minutes)}
                  style={[styles.optionRow, selectedReminderMinutes === option.minutes && styles.optionRowSelected]}
                >
                  <Text style={[styles.optionLabel, selectedReminderMinutes === option.minutes && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  {selectedReminderMinutes === option.minutes && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              ))}

              <Text style={[styles.modalSectionTitle, { marginTop: spacing.lg }]}>How to notify</Text>
              <Pressable
                onPress={() => setSelectedNotificationType('notification')}
                style={[styles.optionRow, selectedNotificationType === 'notification' && styles.optionRowSelected]}
              >
                <Text style={[styles.optionLabel, selectedNotificationType === 'notification' && styles.optionLabelSelected]}>
                  🔔 Notification
                </Text>
                {selectedNotificationType === 'notification' && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>

              <Pressable
                onPress={() => setSelectedNotificationType('email')}
                style={[styles.optionRow, selectedNotificationType === 'email' && styles.optionRowSelected]}
              >
                <Text style={[styles.optionLabel, selectedNotificationType === 'email' && styles.optionLabelSelected]}>
                  📧 Email
                </Text>
                {selectedNotificationType === 'email' && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable onPress={() => setShowAddReminder(false)} style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void addReminder()} style={[styles.button, styles.saveButton]}>
                <Text style={styles.saveButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.lg },
  loadingText: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: spacing.xl },
  errorText: { color: colors.coral, fontSize: 16, textAlign: 'center', marginTop: spacing.xl },

  eventHeader: { flexDirection: 'row', marginBottom: spacing.lg, alignItems: 'center', gap: spacing.md },
  colorBar: { width: 8, height: 80, borderRadius: 4 },
  headerContent: { flex: 1 },
  eventTitle: { color: colors.ink, fontSize: 28, fontWeight: '800' },
  eventType: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: spacing.xs },

  detailsSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: spacing.md },
  detailRow: { marginBottom: spacing.md },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  detailValue: { color: colors.ink, fontSize: 14, marginTop: spacing.xs },

  descriptionSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  description: { color: colors.ink, fontSize: 14, lineHeight: 20 },

  remindersSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  sectionHeader: { marginBottom: spacing.md },

  reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomColor: colors.line, borderBottomWidth: 1 },
  reminderContent: { flex: 1 },
  reminderText: { color: colors.ink, fontSize: 14 },
  deleteReminderButton: { padding: spacing.sm },
  deleteReminderText: { color: colors.muted, fontSize: 14, fontWeight: '700' },

  addReminderButton: { paddingVertical: spacing.md, marginTop: spacing.md },
  addReminderText: { color: colors.sageDark, fontSize: 14, fontWeight: '700' },

  actionsSection: { gap: spacing.md },
  actionButton: { borderRadius: 12, paddingVertical: spacing.lg, alignItems: 'center' },
  editButton: { backgroundColor: colors.ink },
  editButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' },
  deleteButton: { backgroundColor: colors.coral },
  deleteButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' },

  // Edit mode styles
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 14, padding: spacing.md },
  noteInput: { minHeight: 100, textAlignVertical: 'top' },

  buttonGroup: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  button: { flex: 1, borderRadius: 8, paddingVertical: spacing.lg, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.card },
  cancelButtonText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  saveButton: { backgroundColor: colors.ink },
  saveButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  modalCloseText: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  modalPlaceholder: { opacity: 0 },
  modalScroll: { padding: spacing.lg },
  modalSectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.md },
  modalFooter: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },

  optionRow: { paddingVertical: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionRowSelected: { backgroundColor: colors.card, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, borderRadius: 8 },
  optionLabel: { color: colors.ink, fontSize: 14 },
  optionLabelSelected: { fontWeight: '700', color: colors.sageDark },
  checkmark: { color: colors.sageDark, fontSize: 16, fontWeight: '800' },

  // Date/Time picker styles for edit
  dateTimeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  pickerButton: { flex: 1, backgroundColor: colors.card, borderColor: colors.line, borderRadius: 8, borderWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  pickerButtonText: { color: colors.ink, fontSize: 14, fontWeight: '600' },

  pickerContainer: { backgroundColor: colors.card, borderRadius: 8, marginBottom: spacing.md, maxHeight: 250 },
  dateScroll: { maxHeight: 250 },
  dateOption: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  dateOptionSelected: { backgroundColor: colors.sageDark },
  dateOptionText: { color: colors.ink, fontSize: 14 },
  dateOptionTextSelected: { color: colors.card, fontWeight: '800' },

  timePickerContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 8, marginBottom: spacing.md, height: 240, overflow: 'hidden' },
  timeColumn: { flex: 1, borderRightWidth: 1, borderRightColor: colors.line },
  timeLabel: { textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '800', paddingVertical: spacing.sm },
  timeScroll: { flex: 1, minHeight: 200 },
  timeOption: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, height: 44 },
  timeOptionSelected: { backgroundColor: colors.coral },
  timeOptionText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  timeOptionTextSelected: { color: colors.card, fontWeight: '800' },

  // Reminder options in edit
  reminderOptions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  reminderButton: { flex: 1, minWidth: '48%', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 8, borderWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, alignItems: 'center' },
  reminderButtonActive: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  reminderButtonText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  reminderButtonTextActive: { color: colors.card, fontWeight: '800' },

  // Repeat options in edit
  repeatOptions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  repeatButton: { flex: 1, minWidth: '48%', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 8, borderWidth: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, alignItems: 'center' },
  repeatButtonActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  repeatButtonText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  repeatButtonTextActive: { color: colors.card, fontWeight: '800' },
});
