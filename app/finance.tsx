import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type Transaction = { id: string; amount: number; transaction_type: 'income' | 'expense'; merchant: string | null; description: string | null; transaction_date: string };

export default function FinanceScreen() {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, transaction_type, merchant, description, transaction_date')
      .eq('user_id', session.user.id)
      .order('transaction_date', { ascending: false })
      .limit(100);
    setTransactions((data as Transaction[] | null) ?? []);
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const totals = useMemo(() => transactions.reduce((result, item) => { result[item.transaction_type] += Number(item.amount); return result; }, { income: 0, expense: 0 }), [transactions]);

  const visible = useMemo(() => transactions.filter(item => {
    return `${item.merchant ?? ''} ${item.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [transactions, query]);

  async function save() {
    const value = Number(amount);
    if (!session || !value || value < 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        amount: value,
        transaction_type: type,
        merchant: merchant.trim() || null,
        description: description.trim() || null,
        transaction_date: new Date().toISOString().slice(0, 10),
        source: 'manual'
      });
      if (error) throw error;
      setAmount('');
      setMerchant('');
      setDescription('');
      void load();
    } catch (error) {
      Alert.alert('Could not save transaction', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Transaction) {
    setEditingId(item.id);
    setEditAmount(String(item.amount));
    setEditMerchant(item.merchant ?? '');
    setEditDescription(item.description ?? '');
  }

  async function updateTransaction() {
    const value = Number(editAmount);
    if (!editingId || !value) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('transactions').update({
        amount: value,
        merchant: editMerchant.trim() || null,
        description: editDescription.trim() || null
      }).eq('id', editingId);
      if (error) throw error;
      setEditingId(null);
      void load();
    } catch (error) {
      Alert.alert('Could not update transaction', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function deleteTransaction(item: Transaction) {
    Alert.alert('Delete transaction?', `${item.merchant || item.description || 'This transaction'} will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('transactions').delete().eq('id', item.id);
          if (error) Alert.alert('Could not delete transaction', error.message);
          else void load();
        }
      }
    ]);
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>MONEY</Text>
      <Text style={styles.title}>Finance</Text>
      <Text style={styles.subtitle}>Keep the flow of money visible with low-friction records.</Text>

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>INCOME</Text>
          <Text style={styles.income}>+ {totals.income.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>SPENDING</Text>
          <Text style={styles.expense}>- {totals.expense.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Add a transaction</Text>
        <View style={styles.toggle}>
          {(['expense', 'income'] as const).map(option => (
            <Pressable key={option} onPress={() => setType(option)} style={[styles.toggleOption, type === option && styles.toggleSelected]}>
              <Text style={[styles.toggleText, type === option && styles.toggleSelectedText]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={colors.muted} value={amount} onChangeText={setAmount} style={styles.input} />
        <TextInput placeholder="Merchant (optional)" placeholderTextColor={colors.muted} value={merchant} onChangeText={setMerchant} style={styles.input} />
        <TextInput placeholder="Note (optional)" placeholderTextColor={colors.muted} value={description} onChangeText={setDescription} style={styles.input} />
        <Pressable disabled={saving || !Number(amount)} onPress={() => void save()} style={[styles.button, (saving || !Number(amount)) && styles.disabled]}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save transaction'}</Text>
        </Pressable>
      </View>

      <View style={styles.actionsSection}>
        <Pressable 
          onPress={() => router.push('/finance-import')} 
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonIcon}>📥</Text>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Import Statement</Text>
            <Text style={styles.actionButtonSubtitle}>Upload bank CSV</Text>
          </View>
        </Pressable>

        <Pressable 
          onPress={() => router.push('/finance-export')} 
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonIcon}>📤</Text>
          <View style={styles.actionButtonContent}>
            <Text style={styles.actionButtonTitle}>Export CSV</Text>
            <Text style={styles.actionButtonSubtitle}>Download records</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent transactions</Text>
      <TextInput placeholder="Search merchant or note" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.search} />

      {visible.length ? visible.map(item => (
        <View style={styles.block} key={item.id}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text numberOfLines={2} style={styles.merchant}>{item.merchant || item.description || 'Transaction'}</Text>
              <Text style={styles.date}>{item.transaction_date}</Text>
            </View>
            <Text style={[styles.amountText, item.transaction_type === 'income' ? styles.income : styles.expense]}>
              {item.transaction_type === 'income' ? '+' : '-'} {Number(item.amount).toFixed(2)}
            </Text>
          </View>
          {editingId === item.id ? (
            <View style={styles.editBox}>
              <TextInput keyboardType="decimal-pad" value={editAmount} onChangeText={setEditAmount} style={styles.input} />
              <TextInput value={editMerchant} onChangeText={setEditMerchant} style={styles.input} />
              <TextInput value={editDescription} onChangeText={setEditDescription} style={styles.input} />
              <View style={styles.actions}>
                <Pressable onPress={() => setEditingId(null)}><Text style={styles.cancel}>Cancel</Text></Pressable>
                <Pressable onPress={() => void updateTransaction()}><Text style={styles.link}>Save changes</Text></Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable onPress={() => startEdit(item)}><Text style={styles.link}>Edit</Text></Pressable>
              <Pressable onPress={() => deleteTransaction(item)}><Text style={styles.delete}>Delete</Text></Pressable>
            </View>
          )}
        </View>
      )) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{transactions.length ? 'No matching transactions' : 'No transactions yet'}</Text>
          <Text style={styles.description}>Try another search or category.</Text>
        </View>
      )}
    </ScrollView>
  </KeyboardAvoidingView>;
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },
  summary: { backgroundColor: colors.ink, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  summaryLabel: { color: colors.sage, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  income: { color: colors.sageDark, fontSize: 17, fontWeight: '800' },
  expense: { color: colors.coral, fontSize: 17, fontWeight: '800' },
  form: { backgroundColor: '#F2E9D5', borderRadius: 16, marginTop: spacing.lg, padding: spacing.md },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  toggle: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  toggleOption: { borderColor: colors.line, borderRadius: 18, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toggleSelected: { backgroundColor: colors.ink },
  toggleText: { color: colors.muted, textTransform: 'capitalize' },
  toggleSelectedText: { color: colors.card },
  input: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 11, borderWidth: 1, color: colors.ink, marginTop: spacing.sm, padding: spacing.md },
  button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 11, marginTop: spacing.sm, padding: spacing.md },
  disabled: { opacity: .45 },
  buttonText: { color: colors.card, fontWeight: '800' },
  
  // Action buttons section
  actionsSection: { marginTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  actionButton: { 
    backgroundColor: colors.card, 
    borderRadius: 14, 
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md, 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButtonIcon: { fontSize: 28 },
  actionButtonContent: { flex: 1 },
  actionButtonTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  actionButtonSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm, marginTop: spacing.xl },
  info: { flex: 1, minWidth: 0 },
  delete: { color: colors.coral, fontSize: 13, fontWeight: '800' },
  search: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 11, borderWidth: 1, color: colors.ink, padding: spacing.md },
  block: { backgroundColor: colors.card, borderBottomColor: colors.line, borderBottomWidth: 1, paddingBottom: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  merchant: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  date: { color: colors.muted, fontSize: 12, marginTop: 4 },
  amountText: { flexShrink: 1, maxWidth: '43%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: spacing.lg },
  cancel: { color: colors.muted, fontWeight: '800' },
  editBox: { backgroundColor: '#F2E9D5', borderRadius: 12, marginBottom: spacing.sm, padding: spacing.sm },
  empty: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  description: { color: colors.muted, marginTop: 6 }
});
