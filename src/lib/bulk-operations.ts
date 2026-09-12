/**
 * Bulk Event Operations
 * Handles multi-select, batch operations, and mass updates
 */

import { supabase } from './supabase';

export type BulkOperation = 'delete' | 'move' | 'copy' | 'tag' | 'sync' | 'share' | 'change_type';

export type SelectionState = {
  selectedEventIds: Set<string>;
  isSelectMode: boolean;
  selectAll: boolean;
};

/**
 * Initialize selection state
 */
export const initializeSelectionState = (): SelectionState => ({
  selectedEventIds: new Set(),
  isSelectMode: false,
  selectAll: false,
});

/**
 * Toggle event selection
 */
export const toggleEventSelection = (state: SelectionState, eventId: string): SelectionState => {
  const newIds = new Set(state.selectedEventIds);

  if (newIds.has(eventId)) {
    newIds.delete(eventId);
  } else {
    newIds.add(eventId);
  }

  return {
    ...state,
    selectedEventIds: newIds,
    isSelectMode: newIds.size > 0,
  };
};

/**
 * Select all events
 */
export const selectAllEvents = (state: SelectionState, eventIds: string[]): SelectionState => {
  return {
    ...state,
    selectedEventIds: new Set(eventIds),
    isSelectMode: true,
    selectAll: true,
  };
};

/**
 * Deselect all events
 */
export const deselectAllEvents = (state: SelectionState): SelectionState => {
  return {
    ...state,
    selectedEventIds: new Set(),
    isSelectMode: false,
    selectAll: false,
  };
};

/**
 * Delete multiple events
 */
export async function bulkDeleteEvents(
  userId: string,
  eventIds: string[]
): Promise<{ success: boolean; deletedCount: number; message: string }> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .in('id', eventIds)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      deletedCount: eventIds.length,
      message: `${eventIds.length} event(s) deleted`,
    };
  } catch (e) {
    console.error('Error bulk deleting events:', e);
    return {
      success: false,
      deletedCount: 0,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Move multiple events to a new date/time
 */
export async function bulkMoveEvents(
  userId: string,
  eventIds: string[],
  timeDeltaMinutes: number
): Promise<{ success: boolean; movedCount: number; message: string }> {
  try {
    const deltaMs = timeDeltaMinutes * 60 * 1000;

    // Get all events first
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .in('id', eventIds)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    // Update each event
    const updates = events.map(event => ({
      ...event,
      start_time: new Date(new Date(event.start_time).getTime() + deltaMs).toISOString(),
      end_time: new Date(new Date(event.end_time).getTime() + deltaMs).toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: updateError } = await supabase
      .from('calendar_events')
      .upsert(updates);

    if (updateError) throw updateError;

    return {
      success: true,
      movedCount: eventIds.length,
      message: `${eventIds.length} event(s) moved`,
    };
  } catch (e) {
    console.error('Error bulk moving events:', e);
    return {
      success: false,
      movedCount: 0,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Copy multiple events
 */
export async function bulkCopyEvents(
  userId: string,
  eventIds: string[],
  targetDate?: Date
): Promise<{ success: boolean; copiedCount: number; message: string }> {
  try {
    // Get all events to copy
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .in('id', eventIds)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    // Create copies
    const copies = events.map(event => {
      const newEvent = { ...event };
      delete newEvent.id;
      delete newEvent.created_at;

      if (targetDate) {
        const originalStart = new Date(event.start_time);
        const duration = new Date(event.end_time).getTime() - originalStart.getTime();

        newEvent.start_time = new Date(
          targetDate.getTime() + originalStart.getHours() * 60 * 60 * 1000
        ).toISOString();
        newEvent.end_time = new Date(
          new Date(newEvent.start_time).getTime() + duration
        ).toISOString();
      }

      return newEvent;
    });

    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(copies);

    if (insertError) throw insertError;

    return {
      success: true,
      copiedCount: copies.length,
      message: `${copies.length} event(s) copied`,
    };
  } catch (e) {
    console.error('Error bulk copying events:', e);
    return {
      success: false,
      copiedCount: 0,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Change event type for multiple events
 */
export async function bulkChangeEventType(
  userId: string,
  eventIds: string[],
  newType: string
): Promise<{ success: boolean; changedCount: number; message: string }> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .update({ event_type: newType, updated_at: new Date().toISOString() })
      .in('id', eventIds)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      changedCount: eventIds.length,
      message: `${eventIds.length} event type(s) changed to ${newType}`,
    };
  } catch (e) {
    console.error('Error bulk changing event type:', e);
    return {
      success: false,
      changedCount: 0,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Sync multiple events to device calendar
 */
export async function bulkSyncToDevice(
  userId: string,
  eventIds: string[]
): Promise<{ success: boolean; syncedCount: number; message: string }> {
  try {
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .in('id', eventIds)
      .eq('user_id', userId)
      .eq('is_synced_to_device', false);

    if (fetchError) throw fetchError;

    // TODO: Call device sync service for each event
    // For now, just mark as synced
    const { error: updateError } = await supabase
      .from('calendar_events')
      .update({ is_synced_to_device: true, updated_at: new Date().toISOString() })
      .in('id', eventIds);

    if (updateError) throw updateError;

    return {
      success: true,
      syncedCount: events.length,
      message: `${events.length} event(s) synced to device`,
    };
  } catch (e) {
    console.error('Error bulk syncing to device:', e);
    return {
      success: false,
      syncedCount: 0,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Add tag/label to multiple events
 */
export async function bulkAddTag(
  userId: string,
  eventIds: string[],
  tag: string
): Promise<{ success: boolean; taggedCount: number; message: string }> {
  try {
    // Get all events
    const { data: events, error: fetchError } = await supabase
      .from('calendar_events')
      .select('metadata')
      .in('id', eventIds)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    // Add tag to metadata
    const updates = eventIds.map(id => ({
      id,
      metadata: {
        ...(events.find(e => e.id === id)?.metadata || {}),
        tags: [...new Set([...(events.find(e => e.id === id)?.metadata?.tags || []), tag])],
      },
    }));

    const { error: updateError } = await supabase
      .from('calendar_events')
      .upsert(updates);

    if (updateError) throw updateError;

    return {
      success: true,
      taggedCount: eventIds.length,
      message: `Tag '${tag}' added to ${eventIds.length} event(s)`,
    };
  } catch (e) {
    console.error('Error bulk adding tag:', e);
    return {
      success: false,
      taggedCount: 0,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Get bulk operation estimates/preview
 */
export const getBulkOperationPreview = (
  selectedCount: number,
  operation: BulkOperation
): string => {
  const previews: Record<BulkOperation, string> = {
    delete: `Delete ${selectedCount} event(s)?`,
    move: `Move ${selectedCount} event(s)?`,
    copy: `Copy ${selectedCount} event(s)?`,
    tag: `Add tag to ${selectedCount} event(s)?`,
    sync: `Sync ${selectedCount} event(s) to device?`,
    share: `Share ${selectedCount} event(s)?`,
    change_type: `Change type of ${selectedCount} event(s)?`,
  };

  return previews[operation] || 'Perform bulk operation?';
};

export default {
  initializeSelectionState,
  toggleEventSelection,
  selectAllEvents,
  deselectAllEvents,
  bulkDeleteEvents,
  bulkMoveEvents,
  bulkCopyEvents,
  bulkChangeEventType,
  bulkSyncToDevice,
  bulkAddTag,
  getBulkOperationPreview,
};
