import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type Goal = { id: string; title: string; description: string | null; target_value: number | null; current_value: number | null; status: string };

export default function GoalsScreen() {
  const { session } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('goals').select('*').eq('status', 'active').order('created_at', { ascending: false });
    setGoals((data as Goal[] | null) ?? []);
  }, [session]);
  useFocusEffect(useCallback(() => { void loadGoals(); }, [loadGoals]));

  async function createGoal() {
    if (!session || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('goals').insert({ user_id: session.user.id, title: title.trim(), target_value: Number(target) || null });
    setSaving(false);
    if (error) Alert.alert('Could not create goal', error.message);
    else { setTitle(''); setTarget(''); void loadGoals(); }
  }

  async function advanceGoal(goal: Goal) {
    const current = (goal.current_value ?? 0) + 1;
    const complete = goal.target_value !== null && current >= goal.target_value;
    const { error } = await supabase.from('goals').update({ current_value: current, status: complete ? 'completed' : 'active' }).eq('id', goal.id);
    if (error) Alert.alert('Could not update goal', error.message); else void loadGoals();
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>DIRECTION</Text><Text style={styles.title}>Goals</Text>
      <Text style={styles.subtitle}>Choose a few meaningful directions and keep them in view.</Text>
      <View style={styles.form}><Text style={styles.formTitle}>Set a goal</Text><TextInput placeholder="What are you working toward?" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} style={styles.input} /><TextInput keyboardType="decimal-pad" placeholder="Target number (optional)" placeholderTextColor={colors.muted} value={target} onChangeText={setTarget} style={styles.input} /><Pressable disabled={saving || !title.trim()} onPress={() => void createGoal()} style={[styles.button, (saving || !title.trim()) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create goal'}</Text></Pressable></View>
      <Text style={styles.sectionTitle}>Active goals</Text>
      {goals.length ? goals.map(goal => { const current = goal.current_value ?? 0; const targetValue = goal.target_value ?? 0; const percentage = targetValue ? Math.min((current / targetValue) * 100, 100) : 0; return <View style={styles.card} key={goal.id}><Text style={styles.goalTitle}>{goal.title}</Text>{goal.target_value !== null ? <><View style={styles.progressTrack}><View style={[styles.progress, { width: `${percentage}%` }]} /></View><View style={styles.cardFooter}><Text style={styles.progressLabel}>{current} of {goal.target_value}</Text><Pressable onPress={() => void advanceGoal(goal)}><Text style={styles.advance}>+ 1</Text></Pressable></View></> : <Text style={styles.openGoal}>No numeric target yet</Text>}</View>; }) : <View style={styles.empty}><Text style={styles.emptyTitle}>No active goals</Text><Text style={styles.description}>Add one small direction to make this week more intentional.</Text></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 }, back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },
  form: { backgroundColor: '#F2E9D5', borderRadius: 16, padding: spacing.md }, formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 11, borderWidth: 1, color: colors.ink, fontSize: 16, marginTop: spacing.sm, padding: spacing.md }, button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 11, marginTop: spacing.sm, padding: spacing.md }, disabled: { opacity: 0.45 }, buttonText: { color: colors.card, fontWeight: '800' }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.xl }, card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: spacing.sm, padding: spacing.md }, goalTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, progressTrack: { backgroundColor: colors.line, borderRadius: 4, height: 7, marginTop: spacing.md, overflow: 'hidden' }, progress: { backgroundColor: colors.sageDark, borderRadius: 4, height: '100%' }, cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }, progressLabel: { color: colors.muted, fontSize: 12 }, advance: { color: colors.sageDark, fontSize: 13, fontWeight: '800' }, openGoal: { color: colors.muted, marginTop: spacing.sm }, empty: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg }, emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, description: { color: colors.muted, lineHeight: 20, marginTop: 6 },
});
