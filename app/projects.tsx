import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type Project = { id: string; name: string; description: string | null; status: string; progress: number; created_at: string };

export default function ProjectsScreen() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
    setProjects((data as Project[] | null) ?? []);
  }, [session]);
  useFocusEffect(useCallback(() => { void loadProjects(); }, [loadProjects]));

  async function createProject() {
    if (!session || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('projects').insert({ user_id: session.user.id, name: name.trim(), description: description.trim() || null });
    setSaving(false);
    if (error) Alert.alert('Could not create project', error.message);
    else { setName(''); setDescription(''); void loadProjects(); }
  }

  async function advanceProject(project: Project) {
    const progress = Math.min(project.progress + 10, 100);
    const status = progress === 100 ? 'completed' : 'active';
    const { error } = await supabase.from('projects').update({ progress, status, updated_at: new Date().toISOString() }).eq('id', project.id);
    if (error) Alert.alert('Could not update project', error.message); else void loadProjects();
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>PROJECTS</Text><Text style={styles.title}>Things you are making</Text>
      <Text style={styles.subtitle}>Keep unfinished work visible and easy to move forward.</Text>
      <View style={styles.form}><Text style={styles.formTitle}>Start a project</Text><TextInput placeholder="Project name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={styles.input} /><TextInput placeholder="What is it about? (optional)" placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} style={styles.input} /><Pressable disabled={saving || !name.trim()} onPress={() => void createProject()} style={[styles.button, (saving || !name.trim()) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create project'}</Text></Pressable></View>
      <Text style={styles.sectionTitle}>Your projects</Text>
      {projects.length ? projects.map(project => <View style={styles.card} key={project.id}><View style={styles.cardHeader}><Text style={styles.projectName}>{project.name}</Text><Text style={styles.status}>{project.status}</Text></View>{project.description && <Text style={styles.description}>{project.description}</Text>}<View style={styles.progressTrack}><View style={[styles.progress, { width: `${project.progress}%` }]} /></View><View style={styles.cardFooter}><Text style={styles.progressLabel}>{project.progress}% complete</Text><Pressable onPress={() => void advanceProject(project)} disabled={project.progress === 100}><Text style={styles.advance}>{project.progress === 100 ? 'Completed' : '+ 10%'}</Text></Pressable></View></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>No projects yet</Text><Text style={styles.description}>Give an important piece of unfinished work a name.</Text></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 }, back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', lineHeight: 40, marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },
  form: { backgroundColor: '#DCE8D8', borderRadius: 16, padding: spacing.md }, formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }, input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 11, borderWidth: 1, color: colors.ink, fontSize: 16, marginTop: spacing.sm, padding: spacing.md }, button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 11, marginTop: spacing.sm, padding: spacing.md }, disabled: { opacity: 0.45 }, buttonText: { color: colors.card, fontWeight: '800' }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: 14, marginBottom: spacing.sm, padding: spacing.md }, cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, projectName: { color: colors.ink, flex: 1, fontSize: 17, fontWeight: '800' }, status: { color: colors.sageDark, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, description: { color: colors.muted, lineHeight: 20, marginTop: 6 }, progressTrack: { backgroundColor: colors.line, borderRadius: 4, height: 7, marginTop: spacing.md, overflow: 'hidden' }, progress: { backgroundColor: colors.coral, borderRadius: 4, height: '100%' }, cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }, progressLabel: { color: colors.muted, fontSize: 12 }, advance: { color: colors.sageDark, fontSize: 13, fontWeight: '800' }, empty: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg }, emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
});
