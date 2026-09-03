import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

export default function FitnessScreen() {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveWorkout() {
    if (!session || !title.trim() || !exercise.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('activities').insert({
      user_id: session.user.id,
      type: 'workout',
      title: title.trim(),
      metadata: {
        exercises: [{
          name: exercise.trim(),
          weight: Number(weight) || 0,
          sets: Number(sets) || 0,
          reps: Number(reps) || 0,
        }],
      },
      started_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) Alert.alert('Could not save workout', error.message);
    else router.back();
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <View style={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>FITNESS</Text>
      <Text style={styles.title}>Log a workout</Text>
      <Text style={styles.subtitle}>Capture the useful details without slowing down your session.</Text>
      <Text style={styles.label}>Workout name</Text>
      <TextInput placeholder="e.g. Upper body" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} style={styles.input} />
      <Text style={styles.label}>Exercise</Text>
      <TextInput placeholder="e.g. Bench press" placeholderTextColor={colors.muted} value={exercise} onChangeText={setExercise} style={styles.input} />
      <View style={styles.metrics}>
        <Metric label="Weight (kg)" value={weight} onChange={setWeight} />
        <Metric label="Sets" value={sets} onChange={setSets} />
        <Metric label="Reps" value={reps} onChange={setReps} />
      </View>
      <Pressable disabled={saving || !title.trim() || !exercise.trim()} onPress={() => void saveWorkout()} style={[styles.button, (saving || !title.trim() || !exercise.trim()) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save workout'}</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

function Metric({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><TextInput keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} value={value} onChangeText={onChange} style={styles.metricInput} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 54 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md }, input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 16, padding: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, metric: { flex: 1 }, metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 5 }, metricInput: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, padding: spacing.md },
  button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 12, marginTop: spacing.xl, padding: spacing.md }, disabled: { opacity: 0.45 }, buttonText: { color: colors.card, fontSize: 16, fontWeight: '800' },
});
