import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LaunchableApp } from '../../../modules/modo-foco-blocker';
import { AppIcons } from '@/components/app-icons';
import { ProgressRing } from '@/components/progress-ring';
import { colors } from '@/constants/theme';
import type { Session } from '@/lib/storage';

const QUOTES = [
  'Um passo de cada vez.',
  'Feito é melhor que perfeito.',
  'Só os próximos minutos importam.',
  'Você já começou. Isso é o mais difícil.',
];

type Props = {
  session: Session;
  now: number;
  blockedApps: LaunchableApp[];
  onStop: () => void;
};

/** Estado 3: sessão em andamento. */
export function SessionPanel({ session, now, blockedApps, onStop }: Props) {
  const remaining = Math.max(0, session.endsAt - now);
  const progress = remaining / (session.endsAt - session.startedAt);
  // A frase muda a cada sessão, mas fica fixa durante ela.
  const quote = QUOTES[Math.floor(session.startedAt / 1000) % QUOTES.length];

  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <ProgressRing
          size={300}
          thickness={16}
          progress={progress}
          color={colors.accent}
          trackColor={colors.track}
          fillColor={colors.surface}>
          <Text style={styles.time}>{formatRemaining(remaining)}</Text>
          <Text style={styles.muted}>termina às {formatClock(session.endsAt)}</Text>
        </ProgressRing>
      </View>

      <View style={styles.blocked}>
        <AppIcons apps={blockedApps} size={32} max={4} />
        <Text style={styles.muted}>
          {blockedApps.length === 1
            ? '1 app bloqueado até o fim da sessão'
            : `${blockedApps.length} apps bloqueados até o fim da sessão`}
        </Text>
      </View>

      <View style={styles.spacer} />

      <Text style={styles.quote}>“{quote}”</Text>

      <Pressable accessibilityRole="button" onPress={onStop} style={styles.stopButton}>
        <Text style={styles.stopText}>Encerrar sessão</Text>
      </Pressable>
    </View>
  );
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 28 },
  ring: { alignSelf: 'center', marginTop: 12 },
  time: { fontSize: 64, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  muted: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  blocked: { alignItems: 'center', gap: 12 },
  spacer: { flex: 1 },
  quote: { fontSize: 18, fontStyle: 'italic', color: colors.quote, textAlign: 'center' },
  stopButton: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' },
  stopText: { fontSize: 15, fontWeight: '500', color: colors.textMuted, textDecorationLine: 'underline' },
});
