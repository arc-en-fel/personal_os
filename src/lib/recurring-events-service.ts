/**
 * Recurring Events Service
 * Handles creating, modifying, and managing recurring event instances
 */

import { supabase } from './supabase';
import {
  generateRecurringInstances,
  modifyRecurrenceInstance,
  cancelRecurrenceInstance,
  RecurrenceMode,
  RecurrenceException,
} from './recurring-events';

/**
 * Edit a single recurring event instance
 */
export async function editRecurringInstance(
  userId: string,
  eventId: string,
  instanceDate: Date,
  changes: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    all_day?: boolean;
  },
  mode: RecurrenceMode = 'single'
): Promise<{ success: boolean; message: string }> {
  try {
    if (mode === 'single') {
      // Create exception for this instance
      const exception = modifyRecurrenceInstance(eventId, instanceDate, {
        title: changes.title,
        start_time: changes.start_time,
        end_time: changes.end_time,
      });

      const { error } = await supabase.from('recurring_event_exceptions').insert({
        user_id: userId,
        original_event_id: eventId,
        instance_date: instanceDate.toISOString(),
        exception_type: 'modified',
        modified_title: changes.title,
        modified_description: changes.description,
        modified_start_time: changes.start_time,
        modified_end_time: changes.end_time,
        modified_all_day: changes.all_day,
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Event instance updated',
      };
    } else if (mode === 'this_and_following') {
      // Update original event to end before this instance
      // Create new recurring event starting from this instance
      const { data: originalEvent, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      // Create new event with new recurrence rule
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          title: changes.title || originalEvent.title,
          description: changes.description || originalEvent.description,
          event_type: originalEvent.event_type,
          start_time: changes.start_time || originalEvent.start_time,
          end_time: changes.end_time || originalEvent.end_time,
          all_day: changes.all_day !== undefined ? changes.all_day : originalEvent.all_day,
          color: originalEvent.color,
          recurrence_rule: originalEvent.recurrence_rule, // Keep same recurrence for now
          is_synced_to_device: originalEvent.is_synced_to_device,
        });

      if (insertError) throw insertError;

      // Add exception to hide instances before this date
      const { error: exceptionError } = await supabase
        .from('recurring_event_exceptions')
        .insert({
          user_id: userId,
          original_event_id: eventId,
          instance_date: instanceDate.toISOString(),
          exception_type: 'cancelled',
          notes: 'Split from recurring event',
        });

      if (exceptionError) throw exceptionError;

      return {
        success: true,
        message: 'Event series split successfully',
      };
    } else if (mode === 'all') {
      // Update original event
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: changes.title,
          description: changes.description,
          start_time: changes.start_time,
          end_time: changes.end_time,
          all_day: changes.all_day,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      // Clear any exceptions for this event
      await supabase
        .from('recurring_event_exceptions')
        .delete()
        .eq('original_event_id', eventId)
        .eq('exception_type', 'modified');

      return {
        success: true,
        message: 'All event instances updated',
      };
    }

    return {
      success: false,
      message: 'Invalid mode',
    };
  } catch (e) {
    console.error('Error editing recurring instance:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Cancel a recurring event instance
 */
export async function cancelRecurringInstance(
  userId: string,
  eventId: string,
  instanceDate: Date,
  mode: RecurrenceMode = 'single'
): Promise<{ success: boolean; message: string }> {
  try {
    if (mode === 'single') {
      // Create cancellation exception
      const { error } = await supabase.from('recurring_event_exceptions').insert({
        user_id: userId,
        original_event_id: eventId,
        instance_date: instanceDate.toISOString(),
        exception_type: 'cancelled',
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Event instance cancelled',
      };
    } else if (mode === 'this_and_following') {
      // Delete original recurring event
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        message: 'Event series cancelled from this date',
      };
    } else if (mode === 'all') {
      // Delete original recurring event and all exceptions
      const { error: deleteEventError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', userId);

      if (deleteEventError) throw deleteEventError;

      // Delete all exceptions
      await supabase
        .from('recurring_event_exceptions')
        .delete()
        .eq('original_event_id', eventId);

      return {
        success: true,
        message: 'All event instances cancelled',
      };
    }

    return {
      success: false,
      message: 'Invalid mode',
    };
  } catch (e) {
    console.error('Error cancelling recurring instance:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Get exceptions for a recurring event
 */
export async function getRecurringEventExceptions(
  eventId: string
): Promise<RecurrenceException[]> {
  try {
    const { data, error } = await supabase
      .from('recurring_event_exceptions')
      .select('*')
      .eq('original_event_id', eventId);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching exceptions:', e);
    return [];
  }
}

/**
 * Apply exceptions to recurring instances
 */
export function applyExceptionsToInstances(
  instances: any[],
  exceptions: RecurrenceException[]
): any[] {
  return instances.map(instance => {
    const exception = exceptions.find(
      ex =>
        ex.original_event_id === instance.id &&
        new Date(ex.instance_date).toDateString() === instance.instanceDate.toDateString()
    );

    if (exception) {
      if (exception.exception_type === 'cancelled') {
        return null; // Filter out
      } else if (exception.exception_type === 'modified') {
        return {
          ...instance,
          title: exception.modified_title || instance.title,
          start_time: exception.modified_start_time || instance.start_time,
          end_time: exception.modified_end_time || instance.end_time,
          all_day: exception.modified_all_day !== null ? exception.modified_all_day : instance.all_day,
          isModified: true,
        };
      }
    }

    return instance;
  }).filter(i => i !== null);
}

/**
 * Get or create recurring event template
 */
export async function saveRecurringTemplate(
  userId: string,
  template: {
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
    endDate?: Date;
    defaultDurationMinutes?: number;
    color?: string;
  }
): Promise<{ success: boolean; templateId?: string; message: string }> {
  try {
    const { data, error } = await supabase
      .from('recurring_event_templates')
      .insert({
        user_id: userId,
        name: template.name,
        description: template.description,
        frequency: template.frequency,
        interval: template.interval || 1,
        days_of_week: template.daysOfWeek,
        end_date: template.endDate?.toISOString(),
        default_duration_minutes: template.defaultDurationMinutes || 60,
        color: template.color || '#6B7280',
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      templateId: data.id,
      message: 'Template saved',
    };
  } catch (e) {
    console.error('Error saving template:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Get user's recurring event templates
 */
export async function getRecurringTemplates(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('recurring_event_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching templates:', e);
    return [];
  }
}

export default {
  editRecurringInstance,
  cancelRecurringInstance,
  getRecurringEventExceptions,
  applyExceptionsToInstances,
  saveRecurringTemplate,
  getRecurringTemplates,
};
