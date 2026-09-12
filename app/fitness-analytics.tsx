import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing } from '@/src/theme';

type WorkoutData = {
  id: string;
  type: string;
  title: string;
  metadata: {
    exercises?: Array<{
      name: string;
      weight: number;
      sets: number;
      reps: number;
    }>;
  };
  started_at: string;
};

type Stats = {
  workoutCount: number;
  totalVolume: number;
  topExercises: Array<{ name: string; count: number; avgWeight: number }>;
  uniqueDays: number;
  period: '7' | '30';
};

export default function FitnessAnalyticsScreen() {
  const { session } = useAuth();
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const [stats, setStats] = useState<Stats>({
    workoutCount: 0,
    totalVolume: 0,
    topExercises: [],
    uniqueDays: 0,
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
      .eq('type', 'workout')
      .gte('started_at', start.toISOString())
      .order('started_at', { ascending: false });

    const workouts = (data as WorkoutData[] | null) ?? [];

    // Calculate stats
    let totalVol = 0;
    const exerciseMap = new Map<
      string,
      { count: number; weights: number[] }
    >();
    const uniqueDateSet = new Set<string>();

    for (const workout of workouts) {
      // Track unique days
      const date = new Date(workout.started_at).toISOString().slice(0, 10);
      uniqueDateSet.add(date);

      // Process exercises
      const exercises = workout.metadata.exercises ?? [];
      for (const ex of exercises) {
        const volume = ex.sets * ex.reps;
        totalVol += volume;

        const existing = exerciseMap.get(ex.name) ?? { count: 0, weights: [] };
        exerciseMap.set(ex.name, {
          count: existing.count + 1,
          weights: [...existing.weights, ex.weight],
        });
      }
    }

    // Get top exercises
    const topExercises = Array.from(exerciseMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgWeight: data.weights.length
          ? Math.round(
              (data.weights.reduce((a, b) => a + b) / data.weights.length) * 10
            ) / 10
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      workoutCount: workouts.length,
      totalVolume: totalVol,
      topExercises,
      uniqueDays: uniqueDateSet.size,
      period,
    });

    setRefreshing(false);
  }, [session, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const daysPerWeek = (stats.uniqueDays / (parseInt(period) / 7)).toFixed(1);

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
      <Text style={styles.kicker}>FITNESS REVIEW</Text>
      <Text style={styles.title}>Your workouts</Text>
      <Text style={styles.subtitle}>Patterns in your training.</Text>

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
        <Stat label="Workouts" value={String(stats.workoutCount)} />
        <Stat label="Total reps" value={String(stats.totalVolume)} />
        <Stat label="Active days" value={String(stats.uniqueDays)} />
        <Stat
          label="Per week"
          value={`${daysPerWeek}d`}
          subtext="days/week"
        />
      </View>

      {stats.topExercises.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Top exercises</Text>
          <View style={styles.breakdown}>
            {stats.topExercises.map((exercise, idx) => (
              <View key={exercise.name} style={styles.exerciseRow}>
                <View style={styles.rowInfo}>
                  <Text numberOfLines={1} style={styles.exerciseName}>
                    {exercise.name}
                  </Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.count} sessions · avg {exercise.avgWeight}kg
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {stats.workoutCount === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No workouts recorded</Text>
          <Text style={styles.emptyBody}>
            Log a few sessions to see your training patterns appear here.
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
  exerciseRow: {
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
  exerciseName: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
  },
  exerciseMeta: {
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
