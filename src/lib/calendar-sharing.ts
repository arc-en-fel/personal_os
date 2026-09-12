/**
 * Calendar Sharing Service
 * Handles event and calendar sharing with other users
 */

import { supabase } from './supabase';

export type SharePermission = 'view' | 'edit' | 'admin';
export type ShareStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

/**
 * Share event with another user
 */
export async function shareEventWithUser(
  ownerUserId: string,
  eventId: string,
  targetUserEmail: string,
  permission: SharePermission = 'view'
): Promise<{ success: boolean; shareId?: string; message: string }> {
  try {
    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', targetUserEmail)
      .single();

    if (userError || !userData) {
      // If user doesn't exist, create invitation
      return createShareInvitation(ownerUserId, eventId, targetUserEmail, permission);
    }

    // Share with existing user
    const { data, error } = await supabase
      .from('calendar_shares')
      .insert({
        owner_user_id: ownerUserId,
        shared_with_user_id: userData.id,
        event_id: eventId,
        share_type: 'event',
        permission,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    // Create shared event access record
    await supabase.from('shared_event_access').insert({
      user_id: userData.id,
      event_id: eventId,
      owner_user_id: ownerUserId,
      permission,
    });

    // Log to audit
    await logShareAction(ownerUserId, userData.id, eventId, 'shared', null, permission);

    return {
      success: true,
      shareId: data.id,
      message: 'Event shared successfully',
    };
  } catch (e) {
    console.error('Error sharing event:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Create share invitation (for non-existent users)
 */
export async function createShareInvitation(
  ownerUserId: string,
  eventId: string,
  recipientEmail: string,
  permission: SharePermission = 'view'
): Promise<{ success: boolean; shareId?: string; message: string }> {
  try {
    const token = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

    const { data, error } = await supabase
      .from('share_invitations')
      .insert({
        owner_user_id: ownerUserId,
        recipient_email: recipientEmail,
        event_id: eventId,
        permission,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      shareId: data.id,
      message: `Invitation sent to ${recipientEmail}`,
    };
  } catch (e) {
    console.error('Error creating invitation:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Accept share invitation
 */
export async function acceptShareInvitation(
  userId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find and verify invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('share_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !invitation) {
      return {
        success: false,
        message: 'Invalid or expired invitation',
      };
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return {
        success: false,
        message: 'Invitation has expired',
      };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('share_invitations')
      .update({
        status: 'accepted',
        shared_with_user_id: userId,
      })
      .eq('token', token);

    if (updateError) throw updateError;

    // Create shared event access
    if (invitation.event_id) {
      await supabase.from('shared_event_access').insert({
        user_id: userId,
        event_id: invitation.event_id,
        owner_user_id: invitation.owner_user_id,
        permission: invitation.permission,
      });
    }

    return {
      success: true,
      message: 'Share invitation accepted',
    };
  } catch (e) {
    console.error('Error accepting invitation:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Revoke shared access
 */
export async function revokeShare(
  ownerUserId: string,
  shareId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get share details
    const { data: share, error: fetchError } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('id', shareId)
      .eq('owner_user_id', ownerUserId)
      .single();

    if (fetchError || !share) {
      return {
        success: false,
        message: 'Share not found',
      };
    }

    // Update status
    const { error: updateError } = await supabase
      .from('calendar_shares')
      .update({ status: 'revoked' })
      .eq('id', shareId);

    if (updateError) throw updateError;

    // Remove shared event access
    if (share.event_id && share.shared_with_user_id) {
      await supabase
        .from('shared_event_access')
        .delete()
        .eq('event_id', share.event_id)
        .eq('user_id', share.shared_with_user_id);
    }

    // Log to audit
    await logShareAction(ownerUserId, share.shared_with_user_id, share.event_id, 'unshared', share.permission, null);

    return {
      success: true,
      message: 'Access revoked',
    };
  } catch (e) {
    console.error('Error revoking share:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Update share permissions
 */
export async function updateSharePermission(
  ownerUserId: string,
  shareId: string,
  newPermission: SharePermission
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: share, error: fetchError } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('id', shareId)
      .eq('owner_user_id', ownerUserId)
      .single();

    if (fetchError || !share) {
      return {
        success: false,
        message: 'Share not found',
      };
    }

    // Update permission
    const { error: updateError } = await supabase
      .from('calendar_shares')
      .update({ permission: newPermission })
      .eq('id', shareId);

    if (updateError) throw updateError;

    // Update shared event access
    if (share.event_id && share.shared_with_user_id) {
      await supabase
        .from('shared_event_access')
        .update({ permission: newPermission })
        .eq('event_id', share.event_id)
        .eq('user_id', share.shared_with_user_id);
    }

    // Log to audit
    await logShareAction(ownerUserId, share.shared_with_user_id, share.event_id, 'permission_changed', share.permission, newPermission);

    return {
      success: true,
      message: 'Permission updated',
    };
  } catch (e) {
    console.error('Error updating permission:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
}

/**
 * Get shares for user (as owner)
 */
export async function getMyShares(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching shares:', e);
    return [];
  }
}

/**
 * Get events shared with user
 */
export async function getSharedWithMe(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('shared_with_user_id', userId)
      .eq('status', 'accepted')
      .order('shared_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching shared events:', e);
    return [];
  }
}

/**
 * Check if user has access to event
 */
export async function checkEventAccess(
  userId: string,
  eventId: string
): Promise<SharePermission | null> {
  try {
    const { data, error } = await supabase
      .from('shared_event_access')
      .select('permission')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (error || !data) return null;

    return data.permission as SharePermission;
  } catch (e) {
    return null;
  }
}

/**
 * Get pending invitations for user
 */
export async function getPendingInvitations(userEmail: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('share_invitations')
      .select('*')
      .eq('recipient_email', userEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Error fetching invitations:', e);
    return [];
  }
}

/**
 * Generate share token
 */
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Log share action for audit trail
 */
async function logShareAction(
  ownerUserId: string,
  sharedWithUserId: string | null,
  eventId: string | null,
  action: string,
  oldPermission: SharePermission | null,
  newPermission: SharePermission | null
): Promise<void> {
  try {
    await supabase.from('share_audit_log').insert({
      owner_user_id: ownerUserId,
      shared_with_user_id: sharedWithUserId,
      event_id: eventId,
      action,
      old_permission: oldPermission,
      new_permission: newPermission,
    });
  } catch (e) {
    console.warn('Failed to log share action:', e);
  }
}

export default {
  shareEventWithUser,
  createShareInvitation,
  acceptShareInvitation,
  revokeShare,
  updateSharePermission,
  getMyShares,
  getSharedWithMe,
  checkEventAccess,
  getPendingInvitations,
};
