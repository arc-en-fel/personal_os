import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type LearningData = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: {
    skill?: string;
    topic?: string;
    duration_minutes?: number;
  };
  started_at: string;
};

type Stats = {
  sessionCount: number;
  totalMinutes: number;
  skillBreakdown: Array<{
    name: string;
    sessions: number;
    minutes: number;
  }>;
  uniqueDays: number;
  avgSessionLength: number;
  period: '7' | '30';
};

export default function LearningAnalyticsScreen() {
  const { session } = useAuth();
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [stats, setStats] = useState<Stats>({
    sessionCount: 0,
    totalMinutes: 0,
    skillBreakdown: [],
    uniqueDays: 0,
    avgSessionLength: 0,
    period: '7',
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);

    const days = parseInt(period);
    const start = new Date();
    start.setDate(start.getDate() - days);

    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('type', 'learning')
      .gte('started_at', start.toISOString())
      .order('started_at', { ascending: false });

    const sessions = (data as LearningData[] | null) ?? [];

    // Calculate stats
    let totalMin = 0;
    const skillMap = new Map<
      string,
      { sessions: number; minutes: number }
    >();
    const uniqueDateSet = new Set<string>();

    for (const session of sessions) {
      // Track unique days
      const date = new Date(session.started_at).toISOString().slice(0, 10);
      uniqueDateSet.add(date);

      // Process skill data
      const skill = session.metadata.skill ?? 'Uncategorized';
      const duration = session.metadata.duration_minutes ?? 0;
      totalMin += duration;

      const existing = skillMap.get(skill) ?? { sessions: 0, minutes: 0 };
      skillMap.set(skill, {
        sessions: existing.sessions + 1,
        minutes: existing.minutes + duration,
      });
    }

    // Get skill breakdown sorted by time invested
    const skillBreakdown = Array.from(skillMap.entries())
      .map(([name, data]) => ({
        name,
        sessions: data.sessions,
        minutes: data.minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8);

    const avgSession =
      sessions.length > 0
        ? Math.round(totalMin / sessions.length * 10) / 10
        : 0;

    setStats({
      sessionCount: sessions.length,
      totalMinutes: totalMin,
      skillBreakdown,
      uniqueDays: uniqueDateSet.size,
      avgSessionLength: avgSession,
      period,
    });

    setRefreshing(false);
  }, [session, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const sessionsPerWeek = (
    stats.sessionCount /
    (parseInt(period) / 7)
  ).toFixed(1);

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
      <Text style={styles.kicker}>LEARNING REVIEW</Text>
      <Text style={styles.title}>Your progress</Text>
      <Text style={styles.subtitle}>Time invested across your skills.</Text>

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

      <View style={styles.grid}>
        <Stat label="Sessions" value={String(stats.sessionCount)} />
        <Stat label="Total hours" value={`${(stats.totalMinutes / 60).toFixed(1)}h`} />
        <Stat label="Active days" value={String(stats.uniqueDays)} />
        <Stat
          label="Avg session"
          value={`${stats.avgSessionLength.toFixed(0)}m`}
          subtext="minutes"
        />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>CONSISTENCY</Text>
        <Text style={styles.heroTitle}>{sessionsPerWeek}</Text>
        <Text style={styles.heroBody}>learning sessions per week</Text>
      </View>

      {stats.skillBreakdown.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Skills by time invested</Text>
          <View style={styles.breakdown}>
            {stats.skillBreakdown.map((skill) => {
              const hours = (skill.minutes / 60).toFixed(1);
              return (
                <View key={skill.name} style={styles.skillRow}>
                  <View style={styles.rowInfo}>
                    <Text numberOfLines={1} style={styles.skillName}>
                      {skill.name}
                    </Text>
                    <Text style={styles.skillMeta}>
                      {skill.sessions} sessions · {hours}h
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {stats.sessionCount === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No learning sessions yet</Text>
          <Text style={styles.emptyBody}>
            Log some study time to track your skill development over time.
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
    width: '48%',
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
  },
  statSubtext: {
    color: colors.sageDark,
    fontSize: 11,
    marginTop: 2,
  },
  hero: {
    backgroundColor: colors.sage,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    color: colors.sageDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  heroBody: {
    color: colors.ink,
    lineHeight: 21,
    marginTop: spacing.sm,
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
  skillRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  skillName: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  skillMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
