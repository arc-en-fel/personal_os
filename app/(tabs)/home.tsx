import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { getTodayWindow, listActivities } from '@/src/lib/activities';
import { testNotification } from '@/src/lib/notification-service';
import { processPendingReminders, getReminderSchedulerStatus } from '@/src/lib/reminder-scheduler';
import { Activity } from '@/src/types';
import { colors, spacing } from '@/src/theme';

/**
 * Get appropriate greeting based on current time
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  if (hour < 21) return 'Good evening.';
  return 'Good night.';
}


export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [goals, setGoals] = useState<{ id: string; title: string; current_value: number; target_value: number | null }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState(getGreeting());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<Record<string, any> | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    setError(null);
    setGreeting(getGreeting()); // Update greeting on refresh
    const today = getTodayWindow();
    const [{ data: activityData, error: activityError }, { data: todayData, error: todayError }, { data: goalData, error: goalError }] = await Promise.all([
      listActivities(session.user.id, { limit: 5 }),
      listActivities(session.user.id, today),
      supabase.from('goals').select('id,title,current_value,target_value').eq('user_id', session.user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(3)
    ]);
    setActivities(activityData);
    setTodayCount(todayData.length);
    setGoals((goalData as typeof goals | null) ?? []);
    setError(activityError?.message ?? todayError?.message ?? goalError?.message ?? null);
    setRefreshing(false);
  }, [session]);

  const handleTestNotification = useCallback(async () => {
    console.log('[HOME] Testing notification - calling testNotification()');
    setTestResult('Testing... notification should appear in 5 seconds');
    try {
      const success = await testNotification();
      console.log('[HOME] Test notification result:', success);
      setTestResult(success ? '✅ Test notification scheduled! Check your phone in 5 seconds.' : '❌ Failed to schedule test notification. Check console logs.');
    } catch (err) {
      console.error('[HOME] Test notification error:', err);
      setTestResult(`❌ Error: ${String(err)}`);
    }
  }, []);

  const handleManualReminderCheck = useCallback(async () => {
    if (!session) {
      setTestResult('❌ Not logged in');
      return;
    }

    console.log('\n[HOME] 🔧 MANUAL REMINDER CHECK TRIGGERED');
    setTestResult('⏳ Running reminder check manually...');
    
    try {
      const status = getReminderSchedulerStatus();
      console.log('[HOME] Scheduler status:', status);
      
      if (!status.running) {
        console.log('[HOME] ⚠️  Scheduler is NOT running!');
        setTestResult('⚠️  Scheduler is NOT running. Check if user is logged in properly.');
        return;
      }

      const scheduledCount = await processPendingReminders(session.user.id);
      console.log('[HOME] Manual check result:', scheduledCount, 'reminders scheduled');
      
      if (scheduledCount === 0) {
        setTestResult('ℹ️  No pending reminders found. Check if event exists and reminder time is in future.');
      } else {
        setTestResult(`✅ Scheduled ${scheduledCount} reminder(s). Check console for details.`);
      }
    } catch (err) {
      console.error('[HOME] Error running manual check:', err);
      setTestResult(`❌ Error: ${String(err)}`);
    }
  }, [session]);

  const handleShowDiagnostics = useCallback(async () => {
    if (!session) return;

    try {
      const Notifications = await import('expo-notifications');
      const now = new Date();

      // Fetch all scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      // Fetch all reminders from DB
      const { data: reminders } = await supabase
        .from('event_reminders')
        .select('id, event_id, minutes_before, scheduled_time, notification_id, enabled')
        .eq('user_id', session.user.id)
        .order('scheduled_time', { ascending: true });

      const pendingCount = reminders?.filter(r => 
        r.enabled && new Date(r.scheduled_time) > now && !r.notification_id
      ).length || 0;

      const scheduledCount = reminders?.filter(r => !!r.notification_id).length || 0;

      setDiagnosticsData({
        currentTime: now.toISOString(),
        osScheduledNotifications: scheduled.length,
        dbReminders: reminders?.length || 0,
        dbPendingReminders: pendingCount,
        dbScheduledReminders: scheduledCount,
        schedulerRunning: getReminderSchedulerStatus().running,
        schedulerUserId: getReminderSchedulerStatus().userId,
      });

      setDiagnosticsExpanded(!diagnosticsExpanded);
    } catch (e) {
      console.error('[HOME] Error fetching diagnostics:', e);
      setDiagnosticsData({ error: String(e) });
    }
  }, [session, diagnosticsExpanded]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}>
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>YOUR DAY</Text>
        <Text style={styles.title}>{greeting}</Text>
      </View>
      <Pressable onPress={() => void signOut()}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </View>
    <Pressable onPress={() => void handleTestNotification()} style={styles.testNotificationButton}>
      <Text style={styles.testNotificationButtonText}>🧪 Test Notification</Text>
    </Pressable>
    <Pressable onPress={() => void handleManualReminderCheck()} style={styles.testManualCheckButton}>
      <Text style={styles.testManualCheckButtonText}>🔧 Manual Reminder Check</Text>
    </Pressable>
    {testResult && <View style={styles.testResultContainer}><Text style={styles.testResultText}>{testResult}</Text></View>}
    <View style={styles.hero}><Text style={styles.heroLabel}>TODAY</Text><Text style={styles.heroTitle}>{todayCount ? `${todayCount} moments captured` : 'Make today visible'}</Text><Text style={styles.heroBody}>Small records become useful patterns over time.</Text></View>{error && <Text style={styles.error}>{error}</Text>}<View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Active goals</Text><Pressable onPress={() => router.push('/goals')}><Text style={styles.link}>Manage</Text></Pressable></View>{goals.length ? goals.map(goal => <View style={styles.goal} key={goal.id}><Text style={styles.goalTitle}>{goal.title}</Text><Text style={styles.goalMeta}>{goal.target_value === null ? 'In progress' : `${goal.current_value} of ${goal.target_value}`}</Text></View>) : <Pressable onPress={() => router.push('/goals')} style={styles.goalEmpty}><Text style={styles.emptyTitle}>Set a goal for this season</Text><Text style={styles.emptyBody}>Give your attention somewhere meaningful.</Text></Pressable>}<View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent activity</Text><Pressable onPress={() => router.push('/(tabs)/timeline')}><Text style={styles.link}>See all</Text></Pressable></View>{activities.length ? activities.map(activity => <View style={styles.activity} key={activity.id}><View style={styles.dot} /><View><Text style={styles.activityTitle}>{activity.title}</Text><Text style={styles.activityMeta}>{activity.type} · {new Date(activity.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing logged yet</Text><Text style={styles.emptyBody}>Start with a workout, a learning session, or anything else worth remembering.</Text></View>}<Pressable onPress={() => router.push('/log')} style={styles.add}><Text style={styles.addPlus}>+</Text><Text style={styles.addText}>Log an activity</Text></Pressable><Pressable onPress={() => router.push('/capture')} style={styles.capture}><Text style={styles.captureText}>Describe several things at once</Text></Pressable></ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 64, paddingBottom: 100 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, signOut: { color: colors.muted, fontSize: 13, fontWeight: '700' }, testNotificationButton: { backgroundColor: colors.coral, borderRadius: 12, padding: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm, alignItems: 'center' }, testNotificationButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' }, testManualCheckButton: { backgroundColor: colors.amber, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center' }, testManualCheckButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' }, testResultContainer: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, borderLeftColor: colors.coral, borderLeftWidth: 4 }, testResultText: { color: colors.ink, fontSize: 13, fontWeight: '600', lineHeight: 18 }, hero: { backgroundColor: colors.sage, borderRadius: 20, marginTop: spacing.xl, padding: spacing.lg }, heroLabel: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, heroTitle: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: spacing.sm }, heroBody: { color: colors.ink, lineHeight: 21, marginTop: spacing.sm }, error: { color: colors.coral, lineHeight: 20, marginTop: spacing.md }, sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.xl }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, link: { color: colors.sageDark, fontWeight: '700' }, goal: { backgroundColor: colors.card, borderLeftColor: colors.amber, borderLeftWidth: 4, borderRadius: 14, marginBottom: spacing.sm, padding: spacing.md }, goalTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' }, goalMeta: { color: colors.muted, fontSize: 12, marginTop: 4 }, goalEmpty: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md }, activity: { alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md }, dot: { backgroundColor: colors.coral, borderRadius: 7, height: 14, width: 14 }, activityTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' }, activityMeta: { color: colors.muted, marginTop: 4, textTransform: 'capitalize' }, empty: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg }, emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' }, emptyBody: { color: colors.muted, lineHeight: 20, marginTop: 6 }, add: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, padding: spacing.md }, addPlus: { color: colors.card, fontSize: 23, marginRight: 8 }, addText: { color: colors.card, fontSize: 16, fontWeight: '800' }, capture: { alignItems: 'center', padding: spacing.md }, captureText: { color: colors.sageDark, fontSize: 13, fontWeight: '800' } });