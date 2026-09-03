import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, spacing } from '@/src/theme';

export default function AuthScreen() {
  const { configured, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError(null);
    const result = mode === 'signIn' ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setBusy(false);
    if (result.error) setError(result.error); else router.replace('/(tabs)/home');
  }

  return <View style={styles.container}>
    <Text style={styles.eyebrow}>PERSONAL OS</Text><Text style={styles.title}>A calmer way to see your life.</Text>
    <Text style={styles.subtitle}>One place for the actions, goals, and patterns that matter to you.</Text>
    {!configured && <View style={styles.notice}><Text style={styles.noticeText}>Supabase is not configured yet. Add the values from `.env.example` to connect your account.</Text></View>}
    <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} style={styles.input} />
    <TextInput secureTextEntry placeholder="Password" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} style={styles.input} />
    {error && <Text style={styles.error}>{error}</Text>}
    <Pressable disabled={busy} onPress={submit} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Connecting...' : mode === 'signIn' ? 'Sign in' : 'Create account'}</Text>{busy && <ActivityIndicator color={colors.card} />}</Pressable>
    <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}><Text style={styles.switch}>{mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.paper },
  eyebrow: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.md },
  title: { color: colors.ink, fontSize: 38, fontWeight: '800', lineHeight: 43, maxWidth: 350 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: spacing.md, marginBottom: spacing.xl },
  notice: { backgroundColor: '#F2E9D5', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md }, noticeText: { color: '#735D2D', lineHeight: 19 },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.ink, fontSize: 16, padding: spacing.md, marginBottom: spacing.sm },
  button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 12, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', padding: spacing.md, marginTop: spacing.sm }, buttonText: { color: colors.card, fontSize: 16, fontWeight: '700' },
  switch: { color: colors.sageDark, fontWeight: '700', textAlign: 'center', marginTop: spacing.lg }, error: { color: colors.coral, marginBottom: spacing.sm },
});
