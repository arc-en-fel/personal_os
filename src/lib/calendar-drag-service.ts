/**
 * Calendar Drag-and-Drop Service
 * Handles event rescheduling operations with database persistence
 */

import { supabase } from './supabase';
import {
  calculateDropResult,
  checkTimeConflicts,
  isValidDropTime,
  formatTimeDelta,
  getSuggestedDropTime,
  DropResult,
} from './calendar-drag';

export type DragOperationResult = {
  success: boolean;
  message: string;
  conflicts: any[];
  suggestedTime?: Date;
  timeDelta?: string;
};

/**
 * Handle event drop and reschedule
 */
export async function handleEventDrop(
  userId: string,
  eventId: string,
  dragStartY: number,
  dragEndY: number,
  allEvents: any[]
): Promise<DragOperationResult> {
  try {
    // Get the event being dragged
    const draggedEvent = allEvents.find(e => e.id === eventId);
    if (!draggedEvent) {
      return {
        success: false,
        message: 'Event not found',
        conflicts: [],
      };
    }

    // Calculate new times
    const dropResult = calculateDropResult(draggedEvent, dragStartY, dragEndY);
    const { newStartTime, newEndTime, duration } = dropResult;

    // Check if new time is within valid range (6am-10pm)
    if (!isValidDropTime(newStartTime, newEndTime, 6, 22)) {
      return {
        success: false,
        message: 'Event must be between 6 AM and 10 PM',
        conflicts: [],
      };
    }

    // Check for conflicts
    const conflicts = checkTimeConflicts(
      newStartTime,
      newEndTime,
      allEvents,
      eventId
    );

    if (conflicts.length > 0) {
      // Try to find a suggested alternative time
      const suggestedTime = getSuggestedDropTime(
        newStartTime,
        duration,
        allEvents.filter(e => e.id !== eventId)
      );

      return {
        success: false,
        message: `Conflict with ${conflicts.length} event(s)`,
        conflicts,
        suggestedTime,
        timeDelta: formatTimeDelta(
          (newStartTime.getTime() - new Date(draggedEvent.start_time).getTime()) / 60000
        ),
      };
    }

    // Update event in database
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Log the drag operation
    const timeDeltaMinutes = Math.round(
      (newStartTime.getTime() - new Date(draggedEvent.start_time).getTime()) / 60000
    );

    await logDragOperation(userId, eventId, draggedEvent, {
      newStartTime,
      newEndTime,
      duration,
      timeDeltaMinutes,
      hadConflicts: false,
    });

    // If synced to device, update device calendar
    if (draggedEvent.is_synced_to_device && draggedEvent.device_calendar_id) {
      try {
        const { getCalendarSyncService } = await import('./calendar-sync');
        const service = getCalendarSyncService();
        await service.initialize(userId);
        await service.updateEventOnDevice(
          draggedEvent.device_calendar_id,
          {
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
          }
        );
      } catch (e) {
        console.warn('Failed to sync drag operation to device:', e);
      }
    }

    return {
      success: true,
      message: 'Event rescheduled successfully',
      conflicts: [],
      timeDelta: formatTimeDelta(timeDeltaMinutes),
    };
  } catch (e) {
    console.error('Error handling event drop:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
      conflicts: [],
    };
  }
}

/**
 * Log drag operation to database
 */
async function logDragOperation(
  userId: string,
  eventId: string,
  originalEvent: any,
  dropResult: any
): Promise<void> {
  try {
    const originalStart = new Date(originalEvent.start_time);
    const originalEnd = new Date(originalEvent.end_time);

    await supabase.from('calendar_drag_operations').insert({
      user_id: userId,
      event_id: eventId,
      original_start_time: originalStart.toISOString(),
      original_end_time: originalEnd.toISOString(),
      new_start_time: dropResult.newStartTime.toISOString(),
      new_end_time: dropResult.newEndTime.toISOString(),
      duration_minutes: dropResult.duration,
      time_delta_minutes: dropResult.timeDeltaMinutes,
      had_conflicts: false,
      conflict_resolution_method: 'success',
    });
  } catch (e) {
    console.warn('Failed to log drag operation:', e);
  }
}

/**
 * Undo last drag operation
 */
export async function undoLastDragOperation(userId: string): Promise<DragOperationResult> {
  try {
    // Get last drag operation
    const { data: lastOp, error: queryError } = await supabase
      .from('calendar_drag_operations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (queryError || !lastOp) {
      return {
        success: false,
        message: 'No drag operations to undo',
        conflicts: [],
      };
    }

    // Restore original times
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({
        start_time: lastOp.original_start_time,
        end_time: lastOp.original_end_time,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lastOp.event_id);

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Drag operation undone',
      conflicts: [],
    };
  } catch (e) {
    console.error('Error undoing drag operation:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
      conflicts: [],
    };
  }
}

/**
 * Get drag operation history
 */
export async function getDragOperationHistory(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_drag_operations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching drag operation history:', e);
    return [];
  }
}

export default {
  handleEventDrop,
  undoLastDragOperation,
  getDragOperationHistory,
};
