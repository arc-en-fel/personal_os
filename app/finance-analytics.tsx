import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type TransactionRow = {
  id: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  merchant: string | null;
  transaction_date: string;
};

type Stats = {
  income: number;
  spending: number;
  net: number;
  dayCount: number;
  avgDaily: number;
  topMerchants: Array<{ name: string; amount: number; count: number }>;
  period: '7' | '30';
};


export default function FinanceAnalyticsScreen() {
  const { session } = useAuth();
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [stats, setStats] = useState<Stats>({
    income: 0,
    spending: 0,
    net: 0,
    dayCount: 0,
    avgDaily: 0,
    topMerchants: [],
    period: '7',
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);

    const days = parseInt(period);
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);

    const { data } = await supabase
      .from('transactions')
      .select('*, category:transaction_categories(name)')
      .eq('user_id', session.user.id)
      .gte('transaction_date', startStr)
      .order('transaction_date', { ascending: false });

    const transactions = (data as TransactionRow[] | null) ?? [];

    // Calculate stats
    let totalIncome = 0;
    let totalSpending = 0;
    const merchantMap = new Map<
      string,
      { amount: number; count: number }
    >();
    const dateSet = new Set<string>();

    for (const tx of transactions) {
      dateSet.add(tx.transaction_date);
      const amount = Number(tx.amount) || 0;

      if (tx.transaction_type === 'income') {
        totalIncome += amount;
      } else {
        totalSpending += amount;

        if (tx.merchant) {
          const existing = merchantMap.get(tx.merchant) ?? {
            amount: 0,
            count: 0,
          };
          merchantMap.set(tx.merchant, {
            amount: existing.amount + amount,
            count: existing.count + 1,
          });
        }
      }
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const avgDaily = dateSet.size > 0 ? totalSpending / dateSet.size : 0;

    setStats({
      income: totalIncome,
      spending: totalSpending,
      net: totalIncome - totalSpending,
      dayCount: dateSet.size,
      avgDaily,
      topMerchants,
      period,
    });

    setRefreshing(false);
  }, [session, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const savingsRate =
    stats.income > 0
      ? (((stats.income - stats.spending) / stats.income) * 100).toFixed(1)
      : '0';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load()} />
      }
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.kicker}>FINANCIAL REVIEW</Text>
      <Text style={styles.title}>Money flow</Text>
      <Text style={styles.subtitle}>Income, spending, and where it goes.</Text>

      <View style={styles.range}>
        <Text style={styles.rangeLabel}>PERIOD</Text>
        {(['7', '30'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setPeriod(option)}
            style={[
              styles.rangeOption,
              period === option && styles.rangeSelected,
            ]}
          >
            <Text
              style={[
                styles.rangeText,
                period === option && styles.rangeSelectedText,
              ]}
            >
              Last {option} days
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>INCOME</Text>
          <Text style={styles.income}>+{stats.income.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>SPENDING</Text>
          <Text style={styles.expense}>−{stats.spending.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>NET</Text>
          <Text style={[styles.net, stats.net >= 0 ? styles.netPositive : styles.netNegative]}>
            {stats.net >= 0 ? '+' : '−'}{Math.abs(stats.net).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Stat label="Active days" value={String(stats.dayCount)} />
        <Stat
          label="Avg daily"
          value={`${stats.avgDaily.toFixed(0)}`}
          subtext="spending/day"
        />
        <Stat label="Savings rate" value={`${savingsRate}%`} />
      </View>

      {stats.topMerchants.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Top merchants</Text>
          <View style={styles.breakdown}>
            {stats.topMerchants.slice(0, 5).map((merchant) => (
              <View key={merchant.name} style={styles.merchantRow}>
                <View style={styles.rowInfo}>
                  <Text numberOfLines={1} style={styles.merchantName}>
                    {merchant.name}
                  </Text>
                  <Text style={styles.merchantMeta}>
                    {merchant.count} transactions
                  </Text>
                </View>
                <Text style={styles.merchantAmount}>
                  {merchant.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {stats.spending === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No transactions recorded</Text>
          <Text style={styles.emptyBody}>
            Log or import transactions to see your spending patterns.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: {
    color: colors.sageDark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  kicker: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  range: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  rangeLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  rangeOption: {
    borderRadius: 10,
    padding: spacing.sm,
  },
  rangeSelected: {
    backgroundColor: colors.ink,
  },
  rangeText: {
    color: colors.muted,
    fontWeight: '700',
  },
  rangeSelectedText: {
    color: colors.card,
  },
  summary: {
    backgroundColor: colors.sage,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    color: colors.sageDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  income: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  expense: {
    color: colors.coral,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  net: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  netPositive: {
    color: colors.sageDark,
  },
  netNegative: {
    color: colors.coral,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stat: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    width: '32%',
  },
  statValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 5,
  },
  statSubtext: {
    color: colors.sageDark,
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  breakdown: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
  },
  merchantRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  merchantName: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  merchantMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  merchantAmount: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 14,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 6,
  },
});
