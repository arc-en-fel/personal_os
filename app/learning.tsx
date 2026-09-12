import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type PomodoroState = 'idle' | 'working' | 'breaking' | 'long_break';

export default function LearningScreen() {
  const { session } = useAuth();
  const [skill, setSkill] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Pomodoro states
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25 minutes in seconds
  const [cycles, setCycles] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [interruptions, setInterruptions] = useState(0);

  const WORK_TIME = 25 * 60; // 25 minutes
  const BREAK_TIME = 5 * 60; // 5 minutes
  const LONG_BREAK_TIME = 15 * 60; // 15 minutes

  // Timer effect
  useEffect(() => {
    if (pomodoroState === 'idle') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pomodoroState]);

  const handleTimerComplete = () => {
    if (pomodoroState === 'working') {
      setCycles(c => c + 1);
      // Decide break type
      const nextCycles = cycles + 1;
      if (nextCycles % 4 === 0) {
        Alert.alert('Great work!', 'Take a 15 minute break. You\'ve completed 4 cycles!', [
          { text: 'Start Break', onPress: () => startBreak('long_break') }
        ]);
      } else {
        Alert.alert('Time to break!', 'Take a 5 minute break.', [
          { text: 'Start Break', onPress: () => startBreak('breaking') }
        ]);
      }
    } else if (pomodoroState === 'breaking' || pomodoroState === 'long_break') {
      Alert.alert('Break over!', 'Ready for the next cycle?', [
        { text: 'Start Work', onPress: () => startWork() }
      ]);
    }
  };

  const startPomodoro = () => {
    if (!skill.trim() || !topic.trim()) {
      Alert.alert('Required', 'Please enter skill and topic first');
      return;
    }
    setShowPomodoro(true);
    setSessionStarted(true);
    setPomodoroState('working');
    setTimeRemaining(WORK_TIME);
    setCycles(0);
    setSessionDuration(0);
    setInterruptions(0);
  };

  const startWork = () => {
    setPomodoroState('working');
    setTimeRemaining(WORK_TIME);
  };

  const startBreak = (breakType: 'breaking' | 'long_break') => {
    setPomodoroState(breakType);
    setTimeRemaining(breakType === 'breaking' ? BREAK_TIME : LONG_BREAK_TIME);
  };

  const pausePomodoro = () => {
    setPomodoroState('idle');
  };

  const resumePomodoro = () => {
    if (pomodoroState === 'idle' && sessionStarted) {
      setPomodoroState('working');
    }
  };

  const endSession = async () => {
    Alert.alert('End Session?', `You've completed ${cycles} cycles. Save this session?`, [
      { text: 'Discard', onPress: () => setShowPomodoro(false), style: 'cancel' },
      { text: 'Save', onPress: async () => await saveStudySession() }
    ]);
  };

  const saveStudySession = async () => {
    if (!session) return;
    
    const totalMinutes = Math.floor(sessionDuration / 60);
    
    try {
      const { data: activity, error: actError } = await supabase
        .from('activities')
        .insert({
          user_id: session.user.id,
          type: 'learning',
          title: `${skill.trim()}: ${topic.trim()} (Pomodoro)`,
          description: notes.trim() || null,
          metadata: {
            skill: skill.trim(),
            topic: topic.trim(),
            duration_minutes: totalMinutes,
            technique: 'pomodoro',
            cycles: cycles,
            interruptions: interruptions
          },
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (actError) throw actError;

      // Log study session
      if (activity?.id) {
        const { error: sesError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: session.user.id,
            activity_id: activity.id,
            technique: 'pomodoro',
            total_duration_minutes: totalMinutes,
            focused_cycles: cycles,
            breaks_taken: Math.floor(cycles * 1.25), // Approximate breaks
            interruptions: interruptions,
            subject: topic.trim(),
            notes: notes.trim() || null,
            tags: [skill.trim()],
            metadata: { timestamp: new Date().toISOString() }
          });

        if (sesError) console.error('Failed to log study session:', sesError);
      }

      Alert.alert('Session saved!', `${cycles} Pomodoro cycles completed. Great work!`);
      setShowPomodoro(false);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save session: ' + String(error));
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateLabel = (): string => {
    switch (pomodoroState) {
      case 'working':
        return 'Focus Time';
      case 'breaking':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
      default:
        return 'Ready';
    }
  };

  const getStateColor = (): string => {
    switch (pomodoroState) {
      case 'working':
        return colors.coral;
      case 'breaking':
      case 'long_break':
        return colors.sageDark;
      default:
        return colors.ink;
    }
  };

  if (showPomodoro) {
    return (
      <View style={styles.screen}>
        <View style={styles.pomodoroContainer}>
          <Pressable onPress={() => setShowPomodoro(false)} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.pomodoroTitle}>{skill} - {topic}</Text>
          <Text style={[styles.stateLabel, { color: getStateColor() }]}>{getStateLabel()}</Text>

          <View style={[styles.timerDisplay, { borderColor: getStateColor() }]}>
            <Text style={[styles.timerText, { color: getStateColor() }]}>{formatTime(timeRemaining)}</Text>
          </View>

          <View style={styles.cyclesInfo}>
            <Text style={styles.cyclesText}>Cycles: {cycles}</Text>
            <Text style={styles.interruptionsText}>Interruptions: {interruptions}</Text>
          </View>

          <View style={styles.pomodoroControls}>
            <Pressable onPress={pausePomodoro} style={[styles.controlButton, pomodoroState === 'idle' && styles.controlButtonInactive]}>
              <Text style={styles.controlButtonText}>⏸ Pause</Text>
            </Pressable>
            <Pressable onPress={resumePomodoro} style={[styles.controlButton, pomodoroState !== 'idle' && styles.controlButtonInactive]}>
              <Text style={styles.controlButtonText}>▶ Resume</Text>
            </Pressable>
            <Pressable onPress={() => setInterruptions(i => i + 1)} style={styles.controlButton}>
              <Text style={styles.controlButtonText}>⚠ Interrupted</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => void endSession()} style={styles.endButton}>
            <Text style={styles.endButtonText}>End Session & Save</Text>
          </Pressable>

          <View style={styles.techniqueInfo}>
            <Text style={styles.infoTitle}>Pomodoro Technique</Text>
            <Text style={styles.infoText}>• Work for 25 minutes focused</Text>
            <Text style={styles.infoText}>• Take 5 minute breaks</Text>
            <Text style={styles.infoText}>• After 4 cycles: 15 minute break</Text>
            <Text style={styles.infoText}>• Track interruptions for awareness</Text>
          </View>
        </View>
      </View>
    );
  }

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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.kicker}>LEARNING</Text>
        <Text style={styles.title}>Log a study session</Text>
        <Text style={styles.subtitle}>Keep a running record of what you are learning and how deeply.</Text>

        <Text style={styles.label}>Skill</Text>
        <TextInput
          placeholder="e.g. Machine Learning"
          placeholderTextColor={colors.muted}
          value={skill}
          onChangeText={setSkill}
          style={styles.input}
        />

        <Text style={styles.label}>Topic</Text>
        <TextInput
          placeholder="e.g. Random forests"
          placeholderTextColor={colors.muted}
          value={topic}
          onChangeText={setTopic}
          style={styles.input}
        />

        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="e.g. 60"
          placeholderTextColor={colors.muted}
          value={duration}
          onChangeText={setDuration}
          style={styles.input}
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          multiline
          placeholder="What did you take away?"
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, styles.notes]}
        />

        <View style={styles.buttonGroup}>
          <Pressable
            disabled={saving || !skill.trim() || !topic.trim()}
            onPress={() => void saveSession()}
            style={[styles.button, (saving || !skill.trim() || !topic.trim()) && styles.disabled]}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save session'}</Text>
          </Pressable>

          <Pressable
            disabled={!skill.trim() || !topic.trim()}
            onPress={startPomodoro}
            style={[styles.pomodoroButton, (!skill.trim() || !topic.trim()) && styles.disabled]}
          >
            <Text style={styles.pomodoroButtonText}>🍅 Start Pomodoro</Text>
          </Pressable>
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
  label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 16, padding: spacing.md },
  notes: { minHeight: 100, textAlignVertical: 'top' },
  buttonGroup: { gap: spacing.md, marginTop: spacing.xl },
  button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 12, padding: spacing.md },
  pomodoroButton: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 12, padding: spacing.md },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.card, fontSize: 16, fontWeight: '800' },
  pomodoroButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' },

  // Pomodoro styles
  pomodoroContainer: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeText: { color: colors.ink, fontSize: 28, fontWeight: '800' },
  pomodoroTitle: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: spacing.lg, textAlign: 'center' },
  stateLabel: { fontSize: 18, fontWeight: '700', marginBottom: spacing.lg },
  timerDisplay: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  timerText: { fontSize: 64, fontWeight: '800' },
  cyclesInfo: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl },
  cyclesText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  interruptionsText: { color: colors.coral, fontSize: 16, fontWeight: '700' },
  pomodoroControls: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  controlButton: { flex: 1, backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing.md, alignItems: 'center' },
  controlButtonInactive: { opacity: 0.4 },
  controlButtonText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  endButton: { backgroundColor: colors.ink, borderRadius: 12, paddingVertical: spacing.lg, width: '100%', alignItems: 'center', marginBottom: spacing.lg },
  endButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' },
  techniqueInfo: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginTop: spacing.lg },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: spacing.xs }
});
