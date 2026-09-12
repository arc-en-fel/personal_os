import { supabase } from '@/src/lib/supabase';
import { Activity } from '@/src/types';

type ActivityWindow = {
  from?: string;
  to?: string;
  limit?: number;
};

export async function listActivities(userId: string, options: ActivityWindow = {}) {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (options.from) query = query.gte('started_at', options.from);
  if (options.to) query = query.lt('started_at', options.to);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  return { data: (data as Activity[] | null) ?? [], error };
}

export function getTodayWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
