/**
 * Calendar Drag-and-Drop Utilities
 * Handles event rescheduling through drag operations
 */

export type DragState = {
  isDragging: boolean;
  draggedEventId: string | null;
  dragStartTime: Date | null;
  dragStartY: number | null;
  currentDragY: number | null;
  originalEvent: any | null;
};

export type DropResult = {
  eventId: string;
  newStartTime: Date;
  newEndTime: Date;
  duration: number; // minutes
};

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6; // 6 AM

/**
 * Calculate the time from a Y position in the calendar view
 * @param y - Y coordinate in pixels from top of calendar
 * @param hourHeight - Height of one hour in pixels
 * @param startHour - Calendar start hour (e.g., 6 for 6 AM)
 * @returns Date object representing the time at that position
 */
export const getTimeFromPosition = (
  y: number,
  hourHeight: number = HOUR_HEIGHT,
  startHour: number = START_HOUR
): Date => {
  const totalHours = y / hourHeight;
  const hour = Math.floor(startHour + totalHours);
  const minute = Math.round((totalHours % 1) * 60);

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};

/**
 * Calculate Y position from a time
 * @param date - Date to calculate position for
 * @param hourHeight - Height of one hour in pixels
 * @param startHour - Calendar start hour (e.g., 6 for 6 AM)
 * @returns Y coordinate in pixels from top of calendar
 */
export const getPositionFromTime = (
  date: Date,
  hourHeight: number = HOUR_HEIGHT,
  startHour: number = START_HOUR
): number => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalHours = (hour - startHour) + minute / 60;
  return totalHours * hourHeight;
};

/**
 * Initialize drag state
 */
export const initializeDragState = (): DragState => ({
  isDragging: false,
  draggedEventId: null,
  dragStartTime: null,
  dragStartY: null,
  currentDragY: null,
  originalEvent: null,
});

/**
 * Start drag operation
 */
export const startDrag = (
  eventId: string,
  event: any,
  y: number
): DragState => ({
  isDragging: true,
  draggedEventId: eventId,
  dragStartTime: new Date(event.start_time),
  dragStartY: y,
  currentDragY: y,
  originalEvent: event,
});

/**
 * Update drag position
 */
export const updateDragPosition = (state: DragState, y: number): DragState => ({
  ...state,
  currentDragY: y,
});

/**
 * Calculate drop result from drag operation
 */
export const calculateDropResult = (
  event: any,
  dragStartY: number,
  dragEndY: number
): DropResult => {
  const pixelDelta = dragEndY - dragStartY;
  const hoursDelta = pixelDelta / HOUR_HEIGHT;
  const minutesDelta = Math.round(hoursDelta * 60);

  const originalStart = new Date(event.start_time);
  const originalEnd = new Date(event.end_time);

  const newStartTime = new Date(originalStart.getTime() + minutesDelta * 60000);
  const newEndTime = new Date(originalEnd.getTime() + minutesDelta * 60000);
  
  const duration = (originalEnd.getTime() - originalStart.getTime()) / 60000; // minutes

  return {
    eventId: event.id,
    newStartTime,
    newEndTime,
    duration,
  };
};

/**
 * Validate drop time (ensure within business hours or configurable range)
 */
export const isValidDropTime = (
  newStartTime: Date,
  newEndTime: Date,
  minHour: number = START_HOUR,
  maxHour: number = 22
): boolean => {
  const startHour = newStartTime.getHours();
  const endHour = newEndTime.getHours();

  return startHour >= minHour && endHour <= maxHour;
};

/**
 * Check for time conflicts with other events
 */
export const checkTimeConflicts = (
  newStartTime: Date,
  newEndTime: Date,
  otherEvents: any[],
  excludeEventId?: string
): any[] => {
  const conflicts: any[] = [];

  for (const event of otherEvents) {
    if (excludeEventId && event.id === excludeEventId) continue;
    if (event.all_day) continue; // Ignore all-day events

    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // Check if times overlap
    if (newStartTime < eventEnd && newEndTime > eventStart) {
      conflicts.push(event);
    }
  }

  return conflicts;
};

/**
 * Snap time to nearest 15-minute interval
 */
export const snapToInterval = (date: Date, intervalMinutes: number = 15): Date => {
  const ms = 1000 * 60 * intervalMinutes;
  const rounded = Math.round(date.getTime() / ms) * ms;
  return new Date(rounded);
};

/**
 * Format time delta for display
 */
export const formatTimeDelta = (minutes: number): string => {
  if (minutes === 0) return 'Same time';
  if (minutes < 0) {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m earlier`;
    }
    return `${mins}m earlier`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m later`;
    }
    return `${mins}m later`;
  }
};

/**
 * Get suggestion for optimal drop time (find nearest free slot)
 */
export const getSuggestedDropTime = (
  startTime: Date,
  duration: number,
  otherEvents: any[],
  maxSearchHours: number = 4
): Date | null => {
  let currentTime = new Date(startTime);
  const maxTime = new Date(startTime.getTime() + maxSearchHours * 60 * 60 * 1000);

  while (currentTime < maxTime) {
    const endTime = new Date(currentTime.getTime() + duration * 60000);
    const conflicts = checkTimeConflicts(currentTime, endTime, otherEvents);

    if (conflicts.length === 0) {
      return snapToInterval(currentTime);
    }

    // Jump to end of first conflicting event
    if (conflicts.length > 0) {
      currentTime = new Date(new Date(conflicts[0].end_time).getTime() + 1000);
    }
  }

  return null;
};

/**
 * Calculate visual feedback during drag (preview of new time)
 */
export const getPreviewTime = (
  originalStart: Date,
  dragStartY: number,
  currentY: number
): Date => {
  const pixelDelta = currentY - dragStartY;
  const hoursDelta = pixelDelta / HOUR_HEIGHT;
  const minutesDelta = Math.round(hoursDelta * 60);

  const previewStart = new Date(originalStart.getTime() + minutesDelta * 60000);
  return snapToInterval(previewStart);
};

export default {
  getTimeFromPosition,
  getPositionFromTime,
  initializeDragState,
  startDrag,
  updateDragPosition,
  calculateDropResult,
  isValidDropTime,
  checkTimeConflicts,
  snapToInterval,
  formatTimeDelta,
  getSuggestedDropTime,
  getPreviewTime,
};
