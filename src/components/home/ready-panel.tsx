import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LaunchableApp } from '../../../modules/modo-foco-blocker';
import { AppIcons } from '@/components/app-icons';
import { ProgressRing } from '@/components/progress-ring';
import { colors, radius } from '@/constants/theme';

// A opção de 2 min só aparece em desenvolvimento, para testar o fim da sessão rapidamente.
const DURATIONS_MIN = __DEV__ ? [2, 5, 15, 25, 50] : [5, 15, 25, 50];

type Props = {
  duration: number;
  onChangeDuration: (minutes: number) => void;
  onStart: () => void;
  blockedApps: LaunchableApp[];
  onEditApps: () => void;
};

/** Estado 2: pronto para focar. */
export function ReadyPanel(props: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <ProgressRing
          size={280}
          thickness={14}
          progress={1}
          color={colors.accent}
          trackColor={colors.track}
          fillColor={colors.surface}>
          <Text style={styles.time}>{String(props.duration).padStart(2, '0')}:00</Text>
          <Text style={styles.muted}>minutos de foco</Text>
        </ProgressRing>
      </View>

      <View style={styles.chips}>
        {DURATIONS_MIN.map((min) => {
          const selected = min === props.duration;
          return (
            <Pressable
              key={min}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => props.onChangeDuration(min)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{min} min</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable accessibilityRole="button" onPress={props.onStart} style={styles.startButton}>
        <Text style={styles.startButtonText}>▶  Iniciar foco</Text>
      </Pressable>

      <View style={styles.spacer} />

      <Pressable accessibilityRole="button" onPress={props.onEditApps} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Bloqueados durante o foco</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        <AppIcons apps={props.blockedApps} size={40} max={4} showOverflow />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 24 },
  ring: { alignSelf: 'center', marginTop: 8 },
  time: { fontSize: 60, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  muted: { fontSize: 15, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: {
    minWidth: 60,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 15, fontWeight: '500', color: colors.text },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  startButton: {
    height: 58,
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  spacer: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  chevron: { fontSize: 28, color: colors.textMuted, marginTop: -4 },
});
