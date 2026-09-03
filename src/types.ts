export type Activity = {
  id: string;
  user_id: string;
  area_id: string | null;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  created_at: string;
};

export type NewActivity = Pick<Activity, 'type' | 'title' | 'description' | 'metadata' | 'started_at'> & {
  area_id?: string | null;
};

export type Area = { id: string; name: string; icon: string | null; description: string | null };
