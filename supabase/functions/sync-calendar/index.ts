import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!token || !url || !anonKey) {
      return json({ error: 'Authentication required' }, 401);
    }

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return json({ error: 'Authentication required' }, 401);
    }

    console.log(`Starting calendar sync for user ${user.id}`);

    // Get or create calendar settings
    let { data: settings } = await supabase
      .from('calendar_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!settings) {
      const { data: newSettings } = await supabase
        .from('calendar_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      settings = newSettings;
    }

    let syncedCount = 0;

    // Sync reminders to calendar events
    if (settings?.sync_reminders_to_calendar) {
      const reminderCount = await syncRemindersToCalendar(supabase, user.id, settings);
      syncedCount += reminderCount;
    }

    // Sync goals to calendar events
    if (settings?.sync_goals_to_calendar) {
      const goalCount = await syncGoalsToCalendar(supabase, user.id, settings);
      syncedCount += goalCount;
    }

    // Sync study sessions to calendar events
    if (settings?.sync_study_sessions_to_calendar) {
      const sessionCount = await syncStudySessionsToCalendar(supabase, user.id, settings);
      syncedCount += sessionCount;
    }

    // Update last sync time
    await supabase
      .from('calendar_settings')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id);

    console.log(`Calendar sync completed: ${syncedCount} events synced`);

    return json({
      success: true,
      events_synced: syncedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Failed to sync calendar' }, 500);
  }
});

async function syncRemindersToCalendar(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  settings: any
): Promise<number> {
  try {
    // Get active reminders
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    let synced = 0;

    for (const reminder of (reminders as any[] | null) ?? []) {
      // Check if calendar event already exists
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('reminder_id', reminder.id)
        .eq('user_id', userId)
        .single();

      if (existing) {
        continue; // Already synced
      }

      // Create calendar event from reminder
      const startTime = new Date(reminder.next_trigger_at);
      const endTime = new Date(startTime.getTime() + (settings?.default_event_duration_minutes || 60) * 60000);

      const { error } = await supabase.from('calendar_events').insert({
        user_id: userId,
        reminder_id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        event_type: 'reminder',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        color: settings?.default_event_color || '#3B82F6',
        is_recurring: reminder.repeat_interval ? true : false,
        recurrence_rule: reminder.repeat_interval ? buildRecurrenceRule(reminder) : null,
        metadata: { source: 'reminder', reminder_type: reminder.reminder_type }
      });

      if (!error) {
        synced++;

        // Log sync event
        await supabase.from('calendar_sync_log').insert({
          user_id: userId,
          sync_direction: 'push',
          sync_status: 'success',
          source: 'reminder',
          synced_at: new Date().toISOString()
        });
      }
    }

    return synced;
  } catch (e) {
    console.error('Failed to sync reminders:', e);
    return 0;
  }
}

async function syncGoalsToCalendar(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  settings: any
): Promise<number> {
  try {
    // Get active goals with target dates
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('target_date', 'is', null);

    let synced = 0;

    for (const goal of (goals as any[] | null) ?? []) {
      // Check if calendar event already exists
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('goal_id', goal.id)
        .eq('user_id', userId)
        .single();

      if (existing) {
        continue; // Already synced
      }

      // Create all-day calendar event for goal deadline
      const targetDate = new Date(goal.target_date);
      targetDate.setHours(0, 0, 0, 0);

      const { error } = await supabase.from('calendar_events').insert({
        user_id: userId,
        goal_id: goal.id,
        title: `Goal Deadline: ${goal.title}`,
        description: goal.description,
        event_type: 'goal_deadline',
        start_time: targetDate.toISOString(),
        end_time: new Date(targetDate.getTime() + 24 * 60 * 60000).toISOString(),
        all_day: true,
        color: '#EF4444', // Red for deadline
        metadata: { source: 'goal', goal_type: 'deadline' }
      });

      if (!error) {
        synced++;

        await supabase.from('calendar_sync_log').insert({
          user_id: userId,
          sync_direction: 'push',
          sync_status: 'success',
          source: 'goal',
          synced_at: new Date().toISOString()
        });
      }
    }

    return synced;
  } catch (e) {
    console.error('Failed to sync goals:', e);
    return 0;
  }
}

async function syncStudySessionsToCalendar(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  settings: any
): Promise<number> {
  try {
    // Get recent study sessions
    const pastDay = new Date();
    pastDay.setDate(pastDay.getDate() - 1);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('*, activity:activities(*)')
      .eq('user_id', userId)
      .gte('started_at', pastDay.toISOString())
      .is('ended_at', null); // Only ongoing/recent sessions

    let synced = 0;

    for (const session of (sessions as any[] | null) ?? []) {
      // Check if calendar event already exists
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('activity_id', session.activity_id)
        .eq('user_id', userId)
        .single();

      if (existing) {
        continue; // Already synced
      }

      // Create calendar event for study session
      const startTime = new Date(session.started_at);
      const endTime = new Date(startTime.getTime() + session.total_duration_minutes * 60000);

      const { error } = await supabase.from('calendar_events').insert({
        user_id: userId,
        activity_id: session.activity_id,
        title: `Study: ${session.subject || 'Learning Session'}`,
        description: `${session.technique} technique - ${session.total_duration_minutes} minutes`,
        event_type: 'study_session',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        color: '#8B5CF6', // Purple for study
        metadata: { source: 'study_session', technique: session.technique, cycles: session.focused_cycles }
      });

      if (!error) {
        synced++;

        await supabase.from('calendar_sync_log').insert({
          user_id: userId,
          sync_direction: 'push',
          sync_status: 'success',
          source: 'activity',
          synced_at: new Date().toISOString()
        });
      }
    }

    return synced;
  } catch (e) {
    console.error('Failed to sync study sessions:', e);
    return 0;
  }
}

function buildRecurrenceRule(reminder: any): string {
  // Build RFC 5545 RRULE format
  let rule = 'FREQ=';

  switch (reminder.repeat_unit) {
    case 'minutes':
      rule += `MINUTELY;INTERVAL=${reminder.repeat_interval}`;
      break;
    case 'hours':
      rule += `HOURLY;INTERVAL=${reminder.repeat_interval}`;
      break;
    case 'days':
      rule += `DAILY;INTERVAL=${reminder.repeat_interval}`;
      break;
    case 'weeks':
      rule += `WEEKLY;INTERVAL=${reminder.repeat_interval}`;
      if (reminder.scheduled_day_of_week !== null) {
        const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        rule += `;BYDAY=${days[reminder.scheduled_day_of_week]}`;
      }
      break;
    default:
      return '';
  }

  return rule;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
