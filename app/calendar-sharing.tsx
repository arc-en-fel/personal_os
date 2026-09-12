import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, spacing } from '@/src/theme';
import {
  shareEventWithUser,
  getMyShares,
  revokeShare,
  updateSharePermission,
  getPendingInvitations,
  acceptShareInvitation,
  SharePermission,
} from '@/src/lib/calendar-sharing';

export default function CalendarSharingScreen() {
  const { session } = useAuth();
  const [myShares, setMyShares] = useState<any[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_shares' | 'shared_with_me' | 'invitations'>('my_shares');

  // Share form state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<SharePermission>('view');
  const [sharing, setSharing] = useState(false);

  const loadShares = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    try {
      const [shares, shared] = await Promise.all([
        getMyShares(session.user.id),
        // TODO: Implement getSharedWithMe after first implementation
      ]);

      setMyShares(shares);

      if (session.user.email) {
        const invitations = await getPendingInvitations(session.user.email);
        setPendingInvitations(invitations);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load shares');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadShares();
    }, [loadShares])
  );

  const handleShareEvent = async () => {
    if (!session || !recipientEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setSharing(true);

    try {
      // TODO: Get event ID from navigation params or global state
      const eventId = ''; // Placeholder

      if (!eventId) {
        Alert.alert('Error', 'No event selected to share');
        return;
      }

      const result = await shareEventWithUser(session.user.id, eventId, recipientEmail, selectedPermission);

      if (result.success) {
        Alert.alert('Success', result.message);
        setRecipientEmail('');
        await loadShares();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to share: ${String(e)}`);
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!session) return;

    Alert.alert('Revoke Access?', 'This will remove the recipient\'s access to this event.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await revokeShare(session.user.id, shareId);
            if (result.success) {
              await loadShares();
            } else {
              Alert.alert('Error', result.message);
            }
          } catch (e) {
            Alert.alert('Error', `Failed to revoke: ${String(e)}`);
          }
        },
      },
    ]);
  };

  const handleAcceptInvitation = async (token: string) => {
    if (!session) return;

    try {
      const result = await acceptShareInvitation(session.user.id, token);
      if (result.success) {
        Alert.alert('Success', result.message);
        await loadShares();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to accept: ${String(e)}`);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.kicker}>CALENDAR</Text>
        <Text style={styles.title}>Share Calendar</Text>
        <Text style={styles.subtitle}>Share your events with others or view shared calendars.</Text>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {[
            { id: 'my_shares', label: 'My Shares' },
            { id: 'shared_with_me', label: 'Shared With Me' },
            { id: 'invitations', label: 'Invitations' },
          ].map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id as any)}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* My Shares Tab */}
        {activeTab === 'my_shares' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Share Event</Text>

            <Text style={styles.label}>Recipient Email</Text>
            <TextInput
              placeholder="user@example.com"
              placeholderTextColor={colors.muted}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              style={styles.input}
              keyboardType="email-address"
              editable={!sharing}
            />

            <Text style={styles.label}>Permission Level</Text>
            <View style={styles.permissionButtons}>
              {(['view', 'edit', 'admin'] as const).map(perm => (
                <Pressable
                  key={perm}
                  onPress={() => setSelectedPermission(perm)}
                  style={[
                    styles.permissionButton,
                    selectedPermission === perm && styles.permissionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.permissionButtonText,
                      selectedPermission === perm && styles.permissionButtonTextActive,
                    ]}
                  >
                    {perm.charAt(0).toUpperCase() + perm.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => void handleShareEvent()}
              disabled={sharing}
              style={[styles.shareButton, sharing && styles.disabled]}
            >
              <Text style={styles.shareButtonText}>{sharing ? 'Sharing...' : 'Share Event'}</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Current Shares</Text>
            {myShares.length > 0 ? (
              <View>
                {myShares.map(share => (
                  <View key={share.id} style={styles.shareCard}>
                    <View style={styles.shareCardHeader}>
                      <Text style={styles.shareCardTitle}>
                        {share.shared_with_email || 'Unknown'}
                      </Text>
                      <Text style={styles.permissionBadge}>{share.permission}</Text>
                    </View>
                    <Text style={styles.shareCardSubtitle}>
                      Status: {share.status}
                    </Text>
                    <Text style={styles.shareCardDate}>
                      Shared on {new Date(share.shared_at).toLocaleDateString()}
                    </Text>
                    <Pressable
                      onPress={() => void handleRevokeShare(share.id)}
                      style={styles.revokeButton}
                    >
                      <Text style={styles.revokeButtonText}>Revoke Access</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyTitle}>No shares yet</Text>
                <Text style={styles.emptyText}>Share events to get started</Text>
              </View>
            )}
          </View>
        )}

        {/* Shared With Me Tab */}
        {activeTab === 'shared_with_me' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Events Shared With Me</Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔗</Text>
              <Text style={styles.emptyTitle}>No events shared yet</Text>
              <Text style={styles.emptyText}>Events shared with you will appear here</Text>
            </View>
          </View>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Pending Invitations</Text>
            {pendingInvitations.length > 0 ? (
              <View>
                {pendingInvitations.map(inv => (
                  <View key={inv.id} style={styles.invitationCard}>
                    <View style={styles.invitationHeader}>
                      <Text style={styles.invitationTitle}>
                        {inv.calendar_name || 'Calendar Invitation'}
                      </Text>
                      <Text style={styles.permissionBadge}>{inv.permission}</Text>
                    </View>
                    <Text style={styles.invitationSubtitle}>
                      From: {inv.owner_user_id}
                    </Text>
                    <Text style={styles.invitationDate}>
                      Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </Text>
                    <Pressable
                      onPress={() => void handleAcceptInvitation(inv.token)}
                      style={styles.acceptButton}
                    >
                      <Text style={styles.acceptButtonText}>Accept Invitation</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📬</Text>
                <Text style={styles.emptyTitle}>No invitations</Text>
                <Text style={styles.emptyText}>You don't have any pending invitations</Text>
              </View>
            )}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Sharing</Text>
          <Text style={styles.infoText}>
            • View: See shared events but cannot edit{'\n'}
            • Edit: View and modify shared events{'\n'}
            • Admin: Full control including sharing{'\n'}
            • Invitations expire after 30 days
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },

  tabBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, backgroundColor: colors.card, borderRadius: 8, padding: spacing.xs },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: colors.sageDark },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: colors.card },

  tabContent: { marginTop: spacing.lg },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: spacing.md, marginTop: spacing.lg },

  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 14, padding: spacing.md, marginBottom: spacing.lg },

  permissionButtons: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  permissionButton: { flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  permissionButtonActive: { backgroundColor: colors.sageDark, borderColor: colors.sageDark },
  permissionButtonText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  permissionButtonTextActive: { color: colors.card },

  shareButton: { backgroundColor: colors.sageDark, borderRadius: 12, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  shareButtonText: { color: colors.card, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },

  shareCard: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  shareCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  shareCardTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  shareCardSubtitle: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  shareCardDate: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },

  permissionBadge: { backgroundColor: colors.sageDark, color: colors.card, fontSize: 11, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 4 },

  revokeButton: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.md },
  revokeButtonText: { color: colors.coral, fontSize: 12, fontWeight: '700' },

  invitationCard: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, borderWidth: 2, borderColor: colors.sageDark },
  invitationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  invitationTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  invitationSubtitle: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  invitationDate: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },

  acceptButton: { backgroundColor: colors.sageDark, borderRadius: 6, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  acceptButtonText: { color: colors.card, fontSize: 12, fontWeight: '700' },

  emptyState: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, alignItems: 'center', marginVertical: spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, marginTop: spacing.xs, textAlign: 'center' },

  infoSection: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginTop: spacing.lg },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
