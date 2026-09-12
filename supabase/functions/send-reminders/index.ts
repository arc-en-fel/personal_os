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

    const now = new Date();
    console.log(`Checking reminders for user ${user.id} at ${now.toISOString()}`);

    // Get active reminders
    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lte('next_trigger_at', now.toISOString())
      .order('next_trigger_at', { ascending: true });

    const reminderList = (reminders as Array<{
      id: string;
      title: string;
      description: string;
      reminder_type: string;
      trigger_type: string;
      scheduled_time: string | null;
      scheduled_day_of_week: number | null;
      repeat_interval: number | null;
      repeat_unit: string | null;
      last_triggered_at: string | null;
      next_trigger_at: string | null;
    }> | null) ?? [];

    console.log(`Found ${reminderList.length} reminders to process`);

    const notifications: Array<{
      user_id: string;
      reminder_id: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      created_at: string;
    }> = [];
    const updatedReminders: Array<{ id: string; last_triggered_at: string; next_trigger_at: string }> = [];

    // Process each reminder
    for (const reminder of reminderList) {
      try {
        // Create notification
        notifications.push({
          user_id: user.id,
          reminder_id: reminder.id,
          title: reminder.title,
          message: reminder.description || `Time for: ${reminder.title}`,
          type: reminder.reminder_type,
          read: false,
          created_at: now.toISOString()
        });

        // Calculate next trigger time
        const nextTrigger = calculateNextTrigger(reminder, now);

        updatedReminders.push({
          id: reminder.id,
          last_triggered_at: now.toISOString(),
          next_trigger_at: nextTrigger
        });

        console.log(`Processed reminder ${reminder.id}, next trigger: ${nextTrigger}`);
      } catch (e) {
        console.error(`Failed to process reminder ${reminder.id}:`, e);
      }
    }

    // Save notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Failed to insert notifications:', notifError);
      }
    }

    // Update reminders with new trigger times
    for (const updated of updatedReminders) {
      try {
        await supabase
          .from('reminders')
          .update({
            last_triggered_at: updated.last_triggered_at,
            next_trigger_at: updated.next_trigger_at
          })
          .eq('id', updated.id);
      } catch (e) {
        console.error(`Failed to update reminder ${updated.id}:`, e);
      }
    }

    return json({
      success: true,
      reminders_triggered: reminderList.length,
      notifications_created: notifications.length
    });
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Failed to send reminders' }, 500);
  }
});

function calculateNextTrigger(
  reminder: {
    repeat_interval: number | null;
    repeat_unit: string | null;
    scheduled_time: string | null;
    scheduled_day_of_week: number | null;
  },
  now: Date
): string {
  // If no repeat, don't schedule next trigger
  if (!reminder.repeat_interval || !reminder.repeat_unit) {
    return new Date(now.getTime() + 999999999 * 60000).toISOString(); // Far future
  }

  const next = new Date(now);

  switch (reminder.repeat_unit) {
    case 'minutes':
      next.setMinutes(next.getMinutes() + reminder.repeat_interval);
      break;
    case 'hours':
      next.setHours(next.getHours() + reminder.repeat_interval);
      break;
    case 'days':
      next.setDate(next.getDate() + reminder.repeat_interval);
      // If scheduled_time is set, use that time
      if (reminder.scheduled_time) {
        const [hours, minutes] = reminder.scheduled_time.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
      }
      break;
    case 'weeks':
      next.setDate(next.getDate() + reminder.repeat_interval * 7);
      // If scheduled_day_of_week is set, advance to that day
      if (reminder.scheduled_day_of_week !== null) {
        const currentDay = next.getDay();
        const targetDay = reminder.scheduled_day_of_week;
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget > 0) {
          next.setDate(next.getDate() + daysUntilTarget);
        }
      }
      if (reminder.scheduled_time) {
        const [hours, minutes] = reminder.scheduled_time.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
      }
      break;
  }

  return next.toISOString();
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
