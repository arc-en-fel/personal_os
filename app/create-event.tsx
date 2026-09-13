import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
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

export default function CreateEventScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(30);
  const [saving, setSaving] = useState(false);

  const validateAndCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Enter event title');
      return;
    }

    if (!session) {
      Alert.alert('Error', 'Not signed in');
      return;
    }

    setSaving(true);

    try {
      const now = new Date();
      const startDateTime = new Date(now);
      const endDateTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

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

      // Create reminder if specified
      if (reminderMinutes !== null) {
        const reminderScheduledTime = new Date(startDateTime.getTime() - reminderMinutes * 60 * 1000);

        console.log(`[CreateEvent] Creating reminder:`);
        console.log(`  Event start: ${startDateTime.toISOString()}`);
        console.log(`  Reminder time: ${reminderScheduledTime.toISOString()}`);
        console.log(`  In future? ${reminderScheduledTime > new Date()}`);

        await supabase.from('event_reminders').insert({
          user_id: session.user.id,
          event_id: eventData.id,
          title: `Reminder: ${title}`,
          minutes_before: reminderMinutes,
          notification_type: 'notification',
          scheduled_time: reminderScheduledTime.toISOString(),
          enabled: true,
        });
      }

      Alert.alert('✓ Event created!');
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
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

        <Text style={styles.title}>Quick Event</Text>

        {/* Title Input */}
        <View style={styles.mainSection}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            placeholder="Meeting, Workout, Call..."
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
            autoFocus
            maxLength={100}
          />
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

        {/* Create Button */}
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

  // Duration options - horizontal
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

  // Reminder options - grid
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
