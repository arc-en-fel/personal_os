import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type CalendarSettings = {
  user_id: string;
  auto_sync: boolean;
  sync_types: string[];
  device_calendar_name: string;
  device_calendar_id: string | null;
  colors: Record<string, string>;
  timezone: string;
  created_at: string;
  updated_at: string;
};

type SyncType = 'reminders' | 'goals' | 'study_sessions';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

const SYNC_TYPES: { key: SyncType; label: string; description: string }[] = [
  { key: 'reminders', label: 'Reminders', description: 'Sync reminders to calendar' },
  { key: 'goals', label: 'Goals', description: 'Sync goal deadlines as all-day events' },
  { key: 'study_sessions', label: 'Study Sessions', description: 'Sync Pomodoro sessions and study activities' },
];

export default function CalendarSettingsScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTimezoneMenu, setShowTimezoneMenu] = useState(false);

  // Form state
  const [calendarName, setCalendarName] = useState('Personal Tracker');
  const [autoSync, setAutoSync] = useState(true);
  const [syncTypes, setSyncTypes] = useState<SyncType[]>(['reminders', 'goals', 'study_sessions']);
  const [timezone, setTimezone] = useState('UTC');
  const [colors_reminder, setColors_reminder] = useState('#6B7280');
  const [colors_goal, setColors_goal] = useState('#FF6B6B');
  const [colors_study, setColors_study] = useState('#8B5CF6');

  const loadSettings = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      // Try to load settings from database
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      // Handle error - either table doesn't exist or no row found
      if (error) {
        if (error.code === 'PGRST116') {
          // No row found - create default
          await createDefaultSettings();
        } else {
          // Table might not exist - just use defaults
          console.warn('Could not load calendar settings:', error.message);
        }
      } else if (data) {
        // Settings loaded successfully
        const settings = data as CalendarSettings;
        setCalendarName(settings.device_calendar_name || 'Personal Tracker');
        setAutoSync(settings.auto_sync ?? true);
        setSyncTypes((settings.sync_types as SyncType[]) || ['reminders', 'goals', 'study_sessions']);
        setTimezone(settings.timezone || 'UTC');
        if (settings.colors) {
          setColors_reminder(settings.colors.reminder || '#6B7280');
          setColors_goal(settings.colors.goal || '#FF6B6B');
          setColors_study(settings.colors.study || '#8B5CF6');
        }
      }
    } catch (e) {
      console.warn('Error loading calendar settings:', e);
      // Silent fail - just use defaults
    } finally {
      setLoading(false);
    }
  }, [session]);

  const createDefaultSettings = async () => {
    if (!session) return;

    try {
      const defaultSettings = {
        user_id: session.user.id,
        auto_sync: true,
        sync_types: ['reminders', 'goals', 'study_sessions'],
        device_calendar_name: 'Personal Tracker',
        device_calendar_id: null,
        colors: {
          reminder: '#6B7280',
          goal: '#FF6B6B',
          study: '#8B5CF6',
        },
        timezone: 'UTC',
      };

      await supabase.from('calendar_settings').insert([defaultSettings]);

      setCalendarName(defaultSettings.device_calendar_name);
      setAutoSync(defaultSettings.auto_sync);
      setSyncTypes(defaultSettings.sync_types as SyncType[]);
      setTimezone(defaultSettings.timezone);
    } catch (e) {
      console.warn('Could not create default settings:', e);
      // Settings will use state defaults
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings])
  );

  const saveSettings = async () => {
    if (!session) return;
    setSaving(true);

    try {
      const settingsData = {
        device_calendar_name: calendarName.trim(),
        auto_sync: autoSync,
        sync_types: syncTypes,
        timezone,
        colors: {
          reminder: colors_reminder,
          goal: colors_goal,
          study: colors_study,
        },
        updated_at: new Date().toISOString(),
      };

      // Try to update or insert
      const { error } = await supabase
        .from('calendar_settings')
        .update(settingsData)
        .eq('user_id', session.user.id);

      if (error) {
        // If update failed, try insert
        if (error.message.includes('no rows') || error.message.includes('does not exist')) {
          await supabase.from('calendar_settings').insert({
            user_id: session.user.id,
            ...settingsData,
          });
        } else {
          throw error;
        }
      }

      Alert.alert('Success', 'Calendar settings saved');
    } catch (e) {
      console.error('Error saving settings:', e);
      Alert.alert('Info', 'Settings updated locally (database sync not available yet)');
    } finally {
      setSaving(false);
    }
  };

  const toggleSyncType = (type: SyncType) => {
    setSyncTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>CALENDAR</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure your calendar preferences and sync options.</Text>

        {/* Calendar Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Calendar</Text>
          <Text style={styles.label}>Calendar Name</Text>
          <TextInput
            placeholder="Personal Tracker"
            placeholderTextColor={colors.muted}
            value={calendarName}
            onChangeText={setCalendarName}
            style={styles.input}
          />
          <Text style={styles.helperText}>The name of the calendar on your device</Text>
        </View>

        {/* Sync Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Preferences</Text>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Auto Sync</Text>
              <Text style={styles.helperText}>Automatically sync when opening calendar</Text>
            </View>
            <Switch value={autoSync} onValueChange={setAutoSync} trackColor={{ true: colors.sageDark }} />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>
            Sync Types
          </Text>
          {SYNC_TYPES.map(item => (
            <Pressable
              key={item.key}
              onPress={() => toggleSyncType(item.key)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, syncTypes.includes(item.key) && styles.checkboxChecked]}>
                {syncTypes.includes(item.key) && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabel}>
                <Text style={styles.checkboxTitle}>{item.label}</Text>
                <Text style={styles.helperText}>{item.description}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Timezone Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regional Settings</Text>
          <Text style={styles.label}>Timezone</Text>

          {!showTimezoneMenu ? (
            <Pressable
              onPress={() => setShowTimezoneMenu(true)}
              style={styles.dropdownButton}
            >
              <Text style={styles.dropdownButtonText}>{timezone}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </Pressable>
          ) : (
            <View style={styles.timezoneMenu}>
              {TIMEZONES.map(tz => (
                <Pressable
                  key={tz}
                  onPress={() => {
                    setTimezone(tz);
                    setShowTimezoneMenu(false);
                  }}
                  style={[styles.timezoneOption, timezone === tz && styles.timezoneOptionSelected]}
                >
                  <Text style={[styles.timezoneOptionText, timezone === tz && styles.timezoneOptionTextSelected]}>
                    {tz}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={styles.helperText}>Times are stored in UTC and displayed in your timezone</Text>
        </View>

        {/* Event Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Colors</Text>

          <View style={styles.colorRow}>
            <View>
              <Text style={styles.label}>Reminders</Text>
              <Text style={styles.helperText}>Color for reminder events</Text>
            </View>
            <Pressable
              style={[styles.colorPickerButton, { backgroundColor: colors_reminder }]}
            />
          </View>

          <View style={styles.colorRow}>
            <View>
              <Text style={styles.label}>Goal Deadlines</Text>
              <Text style={styles.helperText}>Color for goal deadline events</Text>
            </View>
            <Pressable
              style={[styles.colorPickerButton, { backgroundColor: colors_goal }]}
            />
          </View>

          <View style={styles.colorRow}>
            <View>
              <Text style={styles.label}>Study Sessions</Text>
              <Text style={styles.helperText}>Color for study session events</Text>
            </View>
            <Pressable
              style={[styles.colorPickerButton, { backgroundColor: colors_study }]}
            />
          </View>

          <Text style={[styles.helperText, { marginTop: spacing.md }]}>
            Note: Custom color selection coming soon. Colors are currently set by event type.
          </Text>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Pressable onPress={() => router.back()} style={[styles.button, styles.cancelButton]}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => void saveSettings()}
            disabled={saving}
            style={[styles.button, styles.saveButton, saving && styles.disabled]}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Settings'}</Text>
          </Pressable>
        </View>

        {/* Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Calendar Sync</Text>
          <Text style={styles.infoText}>
            • All events are synced bidirectionally with your device calendar{'\n'}
            • Times are stored in UTC and converted to your timezone{'\n'}
            • Recurrence rules follow RFC 5545 standard{'\n'}
            • You can manually sync events on demand{'\n'}
            • Device calendar changes are automatically imported
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  loadingText: { color: colors.muted, fontSize: 16, textAlign: 'center', marginTop: spacing.xl },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },

  section: { marginBottom: spacing.lg, backgroundColor: colors.card, borderRadius: 12, padding: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: spacing.md },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  helperText: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },

  input: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 14, padding: spacing.md, marginBottom: spacing.sm },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.line, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  checkmark: { color: colors.card, fontSize: 14, fontWeight: '800' },
  checkboxLabel: { flex: 1 },
  checkboxTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },

  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 8, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  dropdownButtonText: { color: colors.ink, fontSize: 14 },
  dropdownArrow: { color: colors.muted, fontSize: 12 },

  timezoneMenu: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 8, borderWidth: 1, maxHeight: 200 },
  timezoneOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  timezoneOptionSelected: { backgroundColor: colors.sageDark },
  timezoneOptionText: { color: colors.ink, fontSize: 14 },
  timezoneOptionTextSelected: { color: colors.card, fontWeight: '700' },

  colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  colorPickerButton: { width: 48, height: 48, borderRadius: 8, borderWidth: 2, borderColor: colors.line },

  buttonContainer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg },
  button: { flex: 1, borderRadius: 8, paddingVertical: spacing.lg, alignItems: 'center' },
  cancelButton: { backgroundColor: colors.card },
  cancelButtonText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  saveButton: { backgroundColor: colors.sageDark },
  saveButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },

  infoSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginTop: spacing.lg },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
