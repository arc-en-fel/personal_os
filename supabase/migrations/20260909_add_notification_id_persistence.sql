-- Add notification ID persistence to event_reminders
-- Allows us to track and cancel OS-level notifications

ALTER TABLE public.event_reminders ADD COLUMN notification_id text;
ALTER TABLE public.event_reminders ADD COLUMN notification_id_scheduled_at timestamptz;
ALTER TABLE public.event_reminders ADD COLUMN scheduled_by_version text;

-- Create index for faster lookup by notification_id
CREATE INDEX IF NOT EXISTS idx_event_reminders_notification_id ON public.event_reminders(notification_id);

-- Add comment for documentation
COMMENT ON COLUMN public.event_reminders.notification_id IS 'Expo-generated notification ID from scheduleNotificationAsync() for tracking/cancellation';
COMMENT ON COLUMN public.event_reminders.notification_id_scheduled_at IS 'Timestamp when the OS notification was scheduled';
COMMENT ON COLUMN public.event_reminders.scheduled_by_version IS 'Version of scheduler that created the notification (for debugging)';
