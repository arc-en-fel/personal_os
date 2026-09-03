import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

export default function LearningScreen() {
  const { session } = useAuth();
  const [skill, setSkill] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveSession() {
    if (!session || !skill.trim() || !topic.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('activities').insert({
      user_id: session.user.id,
      type: 'learning',
      title: `${skill.trim()}: ${topic.trim()}`,
      description: notes.trim() || null,
      metadata: { skill: skill.trim(), topic: topic.trim(), duration_minutes: Number(duration) || 0 },
      started_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) Alert.alert('Could not save learning session', error.message);
    else router.back();
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <View style={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>LEARNING</Text>
      <Text style={styles.title}>Log a study session</Text>
      <Text style={styles.subtitle}>Keep a running record of what you are learning and how deeply.</Text>
      <Text style={styles.label}>Skill</Text>
      <TextInput placeholder="e.g. Machine Learning" placeholderTextColor={colors.muted} value={skill} onChangeText={setSkill} style={styles.input} />
      <Text style={styles.label}>Topic</Text>
      <TextInput placeholder="e.g. Random forests" placeholderTextColor={colors.muted} value={topic} onChangeText={setTopic} style={styles.input} />
      <Text style={styles.label}>Duration (minutes)</Text>
      <TextInput keyboardType="number-pad" placeholder="e.g. 60" placeholderTextColor={colors.muted} value={duration} onChangeText={setDuration} style={styles.input} />
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput multiline placeholder="What did you take away?" placeholderTextColor={colors.muted} value={notes} onChangeText={setNotes} style={[styles.input, styles.notes]} />
      <Pressable disabled={saving || !skill.trim() || !topic.trim()} onPress={() => void saveSession()} style={[styles.button, (saving || !skill.trim() || !topic.trim()) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save session'}</Text></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 54 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md }, input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 16, padding: spacing.md },
  notes: { minHeight: 100, textAlignVertical: 'top' }, button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 12, marginTop: spacing.xl, padding: spacing.md }, disabled: { opacity: 0.45 }, buttonText: { color: colors.card, fontSize: 16, fontWeight: '800' },
});
