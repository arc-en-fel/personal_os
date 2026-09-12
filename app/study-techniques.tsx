import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '@/src/theme';

type Technique = 'pomodoro' | 'spaced_repetition' | 'active_recall' | 'time_blocking' | 'deep_work';

type TechniqueDetail = {
  id: Technique;
  name: string;
  emoji: string;
  description: string;
  duration: string;
  steps: string[];
  benefits: string[];
  tips: string[];
  examples: string[];
};

const TECHNIQUES: TechniqueDetail[] = [
  {
    id: 'pomodoro',
    name: 'Pomodoro Technique',
    emoji: '🍅',
    description:
      'A time-management method that uses focused work intervals (pomodoros) separated by breaks. Perfect for maintaining concentration and building momentum.',
    duration: '25 min work + 5 min break',
    steps: [
      'Choose a task to work on',
      'Set a timer for 25 minutes',
      'Work with full focus until timer rings',
      'Take a 5-minute break',
      'After 4 pomodoros, take a 15-minute break',
      'Repeat the cycle'
    ],
    benefits: [
      'Reduces procrastination - starting is easier with a time limit',
      'Improves focus - knowing a break is coming helps concentration',
      'Prevents burnout - regular breaks maintain energy',
      'Makes progress visible - you count completed pomodoros',
      'Minimizes context switching - fewer interruptions per cycle'
    ],
    tips: [
      'Turn off notifications during work intervals',
      'Use the break time to stretch and hydrate',
      'If a task takes 2+ pomodoros, break it into smaller steps',
      'Track interruptions to identify distractions',
      'Adjust the 25-minute interval to what works for you'
    ],
    examples: [
      'Writing: 1 pomodoro planning, 2 drafting, 1 editing = 4 pomodoros',
      'Learning: 2 pomodoros video, 1 pomodoro notes, 1 practice = 4 pomodoros',
      'Coding: 1 pomodoro planning, 2 coding, 1 testing = 4 pomodoros'
    ]
  },
  {
    id: 'spaced_repetition',
    name: 'Spaced Repetition',
    emoji: '🔄',
    description:
      'A learning technique where you review information at increasing intervals. The spacing effect means you remember better over longer periods.',
    duration: 'Day 1, 3 days, 7 days, 14 days, 30 days',
    steps: [
      'Learn new material (textbook, video, lecture)',
      'Review after 1 day',
      'Review after 3 days',
      'Review after 7 days',
      'Review after 14 days',
      'Review after 30 days',
      'You now have long-term retention'
    ],
    benefits: [
      'Maximizes long-term retention - review at scientifically optimal times',
      'Reduces study time - fewer repetitions needed vs cramming',
      'Prevents forgetting - the spacing effect combats memory decay',
      'Builds deep understanding - multiple exposures at different times',
      'Perfect for exams and professional knowledge'
    ],
    tips: [
      'Use flashcard apps like Anki or Quizlet to automate spacing',
      'Review right before the optimal interval (don\'t review too early)',
      'Mix up your review - don\'t study only one topic per session',
      'Focus on understanding, not just memorization',
      'Adjust intervals based on difficulty of material'
    ],
    examples: [
      'Language learning: Review vocabulary on days 1, 3, 7, 14, 30',
      'Medical student: Review anatomy on days 1, 3, 7, 14, 30',
      'Professional cert: Review key concepts on days 1, 3, 7, 14 before exam'
    ]
  },
  {
    id: 'active_recall',
    name: 'Active Recall',
    emoji: '🧠',
    description:
      'Testing yourself on material rather than passively reviewing. Retrieving information from memory strengthens neural pathways.',
    duration: 'Varies per session',
    steps: [
      'Study the material once',
      'Close the book/notes',
      'Try to recall and write down what you remember',
      'Check your answers against the material',
      'Review what you missed',
      'Repeat the recall process'
    ],
    benefits: [
      'Strengthens memory - retrieving is stronger than reviewing',
      'Identifies weak areas - shows exactly what you don\'t know',
      'Improves exam performance - practice testing reduces test anxiety',
      'Creates durable memories - the effort of recall reinforces learning',
      'Works better than passive reading - proven by cognitive science'
    ],
    tips: [
      'Don\'t look at answers while recalling - the struggle is important',
      'Use various formats: write, speak, teach someone, draw',
      'Start with easier questions, progress to harder ones',
      'Mix recall with new learning - 60% recall, 40% learning',
      'Combine with spaced repetition for maximum effect'
    ],
    examples: [
      'After reading: Close book, write a summary without peeking',
      'After video: Answer practice questions before watching again',
      'Before exam: Take practice tests without notes',
      'Teaching: Explain concepts to a friend without notes'
    ]
  },
  {
    id: 'time_blocking',
    name: 'Time Blocking',
    emoji: '📅',
    description:
      'Scheduling specific blocks of time for specific tasks or subjects. Creates structure and prevents multitasking through deliberate time allocation.',
    duration: '30 min - 2 hours per block',
    steps: [
      'List all tasks or subjects to study',
      'Estimate time needed for each',
      'Block time on your calendar',
      'Include transition time between blocks',
      'Include breaks every 90 minutes',
      'Follow the schedule strictly'
    ],
    benefits: [
      'Prevents multitasking - dedicated time to one subject',
      'Creates accountability - scheduled blocks are harder to skip',
      'Reduces decision fatigue - know what\'s next without thinking',
      'Balances subjects - ensures all subjects get attention',
      'Easy to track progress - completed blocks = progress made'
    ],
    tips: [
      'Use different colors for different subjects',
      'Build in buffer time for overruns',
      'Include breaks - mental fatigue drops focus quality',
      'Be realistic about time estimates (usually underestimated)',
      'Protect blocks from interruptions - this is sacred time'
    ],
    examples: [
      'Math: 9-10am, Physics: 10-11am, Break: 11-11:15am, Chemistry: 11:15am-12:15pm',
      'Deep work morning: 6-8am coding, 8-8:30am break, 8:30-10am design',
      'Study day: 1 hour each subject × 5 subjects = 5 hours scheduled'
    ]
  },
  {
    id: 'deep_work',
    name: 'Deep Work',
    emoji: '🎯',
    description:
      'Professional activity performed in a state of flow with full concentration on cognitively demanding tasks. Produces high-quality output efficiently.',
    duration: '90 - 120 minutes',
    steps: [
      'Choose a specific, important goal',
      'Remove all distractions (phone, email, notifications)',
      'Set a time limit (90-120 minutes is optimal)',
      'Enter flow state - focus completely on the task',
      'Work until timer or natural stopping point',
      'Take a substantial break before next deep work session'
    ],
    benefits: [
      'Produces highest quality work - flow state enables best thinking',
      'Efficient learning - deep focus means faster mastery',
      'Professional edge - deep work is increasingly rare and valuable',
      'Satisfying - the flow state feels rewarding and energizing',
      'Builds expertise faster - quality of focus matters more than hours'
    ],
    tips: [
      'Do deep work during your peak energy hours',
      'Have everything you need before starting (water, notes, etc.)',
      'Use website blockers to prevent distraction browsing',
      'Find a quiet location - or use noise-cancelling headphones',
      'Start with a warm-up task before diving into complex work'
    ],
    examples: [
      'Writing: 2 hours uninterrupted writing on core ideas',
      'Programming: 2 hours on complex algorithm without breaking focus',
      'Research: 90 minutes deep reading and note-taking on one topic',
      'Design: 2 hours focused creative work on mockups/wireframes'
    ]
  }
];

export default function StudyTechniquesScreen() {
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const technique = TECHNIQUES.find(t => t.id === selectedTechnique);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {!selectedTechnique ? (
          <>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>

            <Text style={styles.kicker}>STUDY TECHNIQUES</Text>
            <Text style={styles.title}>Learn better</Text>
            <Text style={styles.subtitle}>Evidence-based techniques to improve focus, retention, and learning efficiency.</Text>

            {TECHNIQUES.map(tech => (
              <Pressable
                key={tech.id}
                onPress={() => setSelectedTechnique(tech.id)}
                style={styles.techniqueCard}
              >
                <Text style={styles.techniqueEmoji}>{tech.emoji}</Text>
                <View style={styles.techniqueCardContent}>
                  <Text style={styles.techniqueName}>{tech.name}</Text>
                  <Text style={styles.techniqueDescription}>{tech.description}</Text>
                  <Text style={styles.techniqueDuration}>⏱ {tech.duration}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
              <Text style={styles.tipsText}>• Combine techniques: Pomodoro + Active Recall is powerful</Text>
              <Text style={styles.tipsText}>• Track your study: Log sessions to identify what works best</Text>
              <Text style={styles.tipsText}>• Experiment: Different techniques work for different people</Text>
              <Text style={styles.tipsText}>• Consistency matters: Regular practice beats cramming</Text>
            </View>
          </>
        ) : technique ? (
          <>
            <Pressable onPress={() => setSelectedTechnique(null)}>
              <Text style={styles.back}>‹ Back</Text>
            </Pressable>

            <Text style={styles.detailEmoji}>{technique.emoji}</Text>
            <Text style={styles.detailName}>{technique.name}</Text>
            <Text style={styles.detailDescription}>{technique.description}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duration</Text>
              <Text style={styles.sectionContent}>{technique.duration}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Steps</Text>
              {technique.steps.map((step, i) => (
                <Text key={i} style={styles.stepText}>
                  {i + 1}. {step}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benefits</Text>
              {technique.benefits.map((benefit, i) => (
                <Text key={i} style={styles.bulletText}>
                  • {benefit}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for Success</Text>
              {technique.tips.map((tip, i) => (
                <Text key={i} style={styles.bulletText}>
                  • {tip}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Real Examples</Text>
              {technique.examples.map((example, i) => (
                <Text key={i} style={styles.exampleText}>
                  {example}
                </Text>
              ))}
            </View>

            <Pressable
              onPress={() => router.push('/learning')}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>Start a {technique.name} Session</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingTop: 54, paddingBottom: 100 },
  back: { color: colors.sageDark, fontSize: 16, fontWeight: '700', marginBottom: spacing.xl },
  kicker: { color: colors.sageDark, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, marginBottom: spacing.lg },

  techniqueCard: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  techniqueEmoji: { fontSize: 32 },
  techniqueCardContent: { flex: 1 },
  techniqueName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  techniqueDescription: { color: colors.muted, fontSize: 12, marginTop: spacing.xs, lineHeight: 16 },
  techniqueDuration: { color: colors.sageDark, fontSize: 12, fontWeight: '700', marginTop: spacing.xs },
  arrow: { color: colors.muted, fontSize: 20 },

  tipsBox: { backgroundColor: '#FFF5E6', borderRadius: 12, padding: spacing.md, marginTop: spacing.lg },
  tipsTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  tipsText: { color: colors.ink, fontSize: 12, lineHeight: 18, marginBottom: spacing.xs },

  // Detail styles
  detailEmoji: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md },
  detailName: { color: colors.ink, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  detailDescription: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: spacing.lg },

  section: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  sectionContent: { color: colors.muted, fontSize: 14, lineHeight: 18 },
  stepText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.xs },
  bulletText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.xs },
  exampleText: { backgroundColor: '#F5F5F5', color: colors.ink, fontSize: 12, lineHeight: 18, padding: spacing.sm, borderRadius: 6, marginBottom: spacing.xs },

  startButton: { backgroundColor: colors.ink, borderRadius: 12, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  startButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' }
});
