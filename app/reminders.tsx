import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  trigger_type: string;
  scheduled_time: string | null;
  is_active: boolean;
  next_trigger_at: string | null;
};

type ReminderForm = {
  title: string;
  description: string;
  type: 'goal' | 'learning' | 'fitness' | 'finance' | 'custom';
  trigger_type: 'time' | 'daily' | 'weekly' | 'custom';
  scheduled_time: string;
  repeat_interval: string;
  repeat_unit: 'minutes' | 'hours' | 'days' | 'weeks';
};

export default function RemindersScreen() {
  const { session } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReminderForm>({
    title: '',
    description: '',
    type: 'custom',
    trigger_type: 'daily',
    scheduled_time: '09:00',
    repeat_interval: '1',
    repeat_unit: 'days'
  });

  const loadReminders = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('reminders')
        .select('id,title,description,reminder_type,trigger_type,scheduled_time,is_active,next_trigger_at')
        .eq('user_id', session.user.id)
        .order('next_trigger_at', { ascending: true });

      setReminders((data as Reminder[] | null) ?? []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load reminders: ' + String(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadReminders();
    }, [loadReminders])
  );

  const createReminder = async () => {
    if (!session || !form.title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }

    try {
      const now = new Date();
      let nextTriggerAt = new Date(now);

      // Set next trigger based on trigger type
      if (form.trigger_type === 'daily' || form.trigger_type === 'time') {
        const [hours, minutes] = form.scheduled_time.split(':').map(Number);
        nextTriggerAt.setHours(hours, minutes, 0, 0);
        if (nextTriggerAt < now) {
          nextTriggerAt.setDate(nextTriggerAt.getDate() + 1);
        }
      }

      const { error } = await supabase.from('reminders').insert({
        user_id: session.user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        reminder_type: form.type,
        trigger_type: form.trigger_type,
        scheduled_time: form.scheduled_time,
        repeat_interval: Number(form.repeat_interval),
        repeat_unit: form.repeat_unit,
        notification_enabled: true,
        next_trigger_at: nextTriggerAt.toISOString(),
        is_active: true,
        metadata: {}
      });

      if (error) {
        Alert.alert('Error', 'Failed to create reminder: ' + error.message);
      } else {
        Alert.alert('Success', 'Reminder created!');
        setShowForm(false);
        setForm({
          title: '',
          description: '',
          type: 'custom',
          trigger_type: 'daily',
          scheduled_time: '09:00',
          repeat_interval: '1',
          repeat_unit: 'days'
        });
        await loadReminders();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create reminder: ' + String(e));
    }
  };

  const deleteReminder = async (id: string) => {
    Alert.alert('Delete Reminder?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('reminders').delete().eq('id', id);
            if (error) throw error;
            await loadReminders();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete reminder: ' + String(e));
          }
        }
      }
    ]);
  };

  const toggleReminder = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_active: !reminder.is_active })
        .eq('id', reminder.id);

      if (error) throw error;
      await loadReminders();
    } catch (e) {
      Alert.alert('Error', 'Failed to update reminder: ' + String(e));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>REMINDERS</Text>
        <Text style={styles.title}>Stay on track</Text>
        <Text style={styles.subtitle}>Set reminders for goals, learning, and focus sessions.</Text>

        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New Reminder</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              placeholder="e.g. Study session"
              placeholderTextColor={colors.muted}
              value={form.title}
              onChangeText={v => setForm({ ...form, title: v })}
              style={styles.input}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              placeholder="Optional details"
              placeholderTextColor={colors.muted}
              value={form.description}
              onChangeText={v => setForm({ ...form, description: v })}
              style={[styles.input, { minHeight: 80 }]}
              multiline
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {(['goal', 'learning', 'fitness', 'finance', 'custom'] as const).map(type => (
                <Pressable
                  key={type}
                  onPress={() => setForm({ ...form, type })}
                  style={[styles.typeButton, form.type === type && styles.typeButtonActive]}
                >
                  <Text style={[styles.typeButtonText, form.type === type && styles.typeButtonTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyRow}>
              <TextInput
                placeholder="1"
                placeholderTextColor={colors.muted}
                value={form.repeat_interval}
                onChangeText={v => setForm({ ...form, repeat_interval: v })}
                style={[styles.input, { flex: 1 }]}
                keyboardType="number-pad"
              />
              <View style={styles.unitPicker}>
                {(['minutes', 'hours', 'days', 'weeks'] as const).map(unit => (
                  <Pressable
                    key={unit}
                    onPress={() => setForm({ ...form, repeat_unit: unit })}
                    style={[styles.unitButton, form.repeat_unit === unit && styles.unitButtonActive]}
                  >
                    <Text
                      style={[styles.unitButtonText, form.repeat_unit === unit && styles.unitButtonTextActive]}
                    >
                      {unit.slice(0, 1).toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={styles.label}>Time</Text>
            <TextInput
              placeholder="09:00"
              placeholderTextColor={colors.muted}
              value={form.scheduled_time}
              onChangeText={v => setForm({ ...form, scheduled_time: v })}
              style={styles.input}
            />

            <View style={styles.formButtons}>
              <Pressable
                onPress={() => setShowForm(false)}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void createReminder()}
                style={[styles.button, styles.submitButton]}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {reminders.length > 0 ? (
              <View>
                {reminders.map(reminder => (
                  <View key={reminder.id} style={styles.reminderCard}>
                    <View style={styles.reminderHeader}>
                      <View style={styles.reminderInfo}>
                        <Text style={styles.reminderTitle}>{reminder.title}</Text>
                        <Text style={styles.reminderType}>{reminder.reminder_type}</Text>
                      </View>
                      <Pressable onPress={() => void toggleReminder(reminder)}>
                        <Text style={styles.toggleButton}>{reminder.is_active ? '✓' : '○'}</Text>
                      </Pressable>
                    </View>

                    {reminder.description && (
                      <Text style={styles.reminderDescription}>{reminder.description}</Text>
                    )}

                    <Text style={styles.reminderMeta}>
                      {reminder.trigger_type} at {reminder.scheduled_time || 'custom'}
                    </Text>

                    {reminder.next_trigger_at && (
                      <Text style={styles.nextTrigger}>
                        Next: {new Date(reminder.next_trigger_at).toLocaleString()}
                      </Text>
                    )}

                    <Pressable onPress={() => deleteReminder(reminder.id)}>
                      <Text style={styles.deleteButton}>🗑 Delete</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No reminders yet</Text>
                <Text style={styles.emptySubtitle}>Create one to get started.</Text>
              </View>
            )}

            <Pressable onPress={() => setShowForm(true)} style={styles.createButton}>
              <Text style={styles.createButtonText}>+ New Reminder</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },

  form: { backgroundColor: '#DCE8D8', borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: spacing.md },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 14, padding: spacing.sm },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  typeButton: { flex: 0.45, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  typeButtonActive: { backgroundColor: colors.ink },
  typeButtonText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  typeButtonTextActive: { color: colors.card },

  frequencyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  unitPicker: { flexDirection: 'row', gap: spacing.xs, flex: 0.6 },
  unitButton: { flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  unitButtonActive: { backgroundColor: colors.ink },
  unitButtonText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  unitButtonTextActive: { color: colors.card },

  formButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  button: { flex: 1, borderRadius: 8, paddingVertical: spacing.md, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.card },
  cancelButtonText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  submitButton: { backgroundColor: colors.ink },
  submitButtonText: { color: colors.card, fontSize: 14, fontWeight: '700' },

  reminderCard: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  reminderInfo: { flex: 1 },
  reminderTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  reminderType: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  toggleButton: { color: colors.sageDark, fontSize: 20, fontWeight: '800' },
  reminderDescription: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  reminderMeta: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs },
  nextTrigger: { color: colors.sageDark, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  deleteButton: { color: colors.coral, fontSize: 12, fontWeight: '700', marginTop: spacing.sm },

  empty: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  emptySubtitle: { color: colors.muted, fontSize: 14, marginTop: spacing.sm },

  createButton: { backgroundColor: colors.ink, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  createButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' }
});
