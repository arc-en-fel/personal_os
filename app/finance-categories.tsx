import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

const builtIn = ['Food', 'Bills', 'Travel', 'Shopping', 'Entertainment', 'Income', 'Other'];
type Category = { id: string; name: string };

export default function FinanceCategoriesScreen() {
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data, error: queryError } = await supabase.from('transaction_categories').select('id,name').eq('user_id', session.user.id).order('name');
    setCategories((data as Category[] | null) ?? []);
    setError(queryError?.message ?? null);
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function createCategory() {
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!session || !cleanName || saving) return;
    if (categories.some(category => category.name.toLowerCase() === cleanName.toLowerCase())) {
      Alert.alert('Category already exists', 'Choose a different name.');
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from('transaction_categories').insert({ user_id: session.user.id, name: cleanName });
    setSaving(false);
    if (insertError) Alert.alert('Could not create category', insertError.message);
    else { setName(''); void load(); }
  }

  function deleteCategory(category: Category) {
    if (builtIn.includes(category.name)) {
      Alert.alert('Built-in category', 'This category is used by automatic statement classification and cannot be deleted.');
      return;
    }
    Alert.alert('Delete category?', 'Transactions using it will become uncategorized.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error: deleteError } = await supabase.from('transaction_categories').delete().eq('id', category.id);
        if (deleteError) Alert.alert('Could not delete category', deleteError.message);
        else void load();
      } },
    ]);
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>MONEY</Text>
      <Text style={styles.title}>Categories</Text>
      <Text style={styles.subtitle}>Keep automatic labels useful by adding the categories that fit your life.</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.form}><Text style={styles.formTitle}>Create a category</Text><TextInput autoCapitalize="words" placeholder="e.g. Subscriptions" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={styles.input} /><Pressable disabled={saving || !name.trim()} onPress={() => void createCategory()} style={[styles.button, (saving || !name.trim()) && styles.disabled]}><Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create category'}</Text></Pressable></View>
      <Text style={styles.sectionTitle}>Your categories</Text>
      {categories.length ? categories.map(category => <View style={styles.row} key={category.id}><View style={styles.info}><Text style={styles.categoryName}>{category.name}</Text><Text style={styles.meta}>{builtIn.includes(category.name) ? 'Automatic category' : 'Custom category'}</Text></View><Pressable onPress={() => deleteCategory(category)}><Text style={[styles.delete, builtIn.includes(category.name) && styles.disabledText]}>Delete</Text></Pressable></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>No categories yet</Text><Text style={styles.meta}>Categories appear here after your first transaction import or manual entry.</Text></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 }, back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl }, kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg }, error: { color: colors.coral, lineHeight: 20, marginBottom: spacing.md }, form: { backgroundColor: '#F2E9D5', borderRadius: 16, padding: spacing.md }, formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 11, borderWidth: 1, color: colors.ink, marginTop: spacing.sm, padding: spacing.md }, button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 11, marginTop: spacing.sm, padding: spacing.md }, disabled: { opacity: 0.45 }, buttonText: { color: colors.card, fontWeight: '800' }, sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.xl }, row: { alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', padding: spacing.md }, info: { flex: 1, minWidth: 0 }, categoryName: { color: colors.ink, fontSize: 16, fontWeight: '800' }, meta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, delete: { color: colors.coral, fontSize: 13, fontWeight: '800' }, disabledText: { color: colors.muted }, empty: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg }, emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
});
