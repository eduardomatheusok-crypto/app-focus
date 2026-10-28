import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

type Props = {
  usageGranted: boolean;
  overlayGranted: boolean;
  blockedCount: number;
  onOpenUsage: () => void;
  onOpenOverlay: () => void;
  onChooseApps: () => void;
};

/** Estado 1: checklist de preparação (primeiro uso). */
export function SetupPanel(props: Props) {
  const appsChosen = props.blockedCount > 0;
  const done = [props.usageGranted, props.overlayGranted, appsChosen].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Preparação</Text>
          <Text style={styles.muted}>{done} de 3</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(done / 3) * 100}%` }]} />
        </View>

        <View>
          <ChecklistRow
            title="Acesso ao uso"
            pendingHint="Permite saber qual app está aberto"
            doneHint="Concedido"
            done={props.usageGranted}
            onPress={props.onOpenUsage}
          />
          <ChecklistRow
            title="Sobrepor a outros apps"
            pendingHint="Mostra a tela de foco por cima"
            doneHint="Concedido"
            done={props.overlayGranted}
            onPress={props.onOpenOverlay}
          />
          <ChecklistRow
            title="Escolher apps"
            pendingHint="Nenhum app escolhido"
            doneHint={`${props.blockedCount} app(s) escolhido(s)`}
            done={appsChosen}
            onPress={props.onChooseApps}
            last
          />
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.footer}>
        <View style={styles.disabledButton}>
          <Text style={styles.disabledButtonText}>Iniciar foco</Text>
        </View>
        <Text style={[styles.muted, styles.center]}>Complete a preparação acima para começar</Text>
      </View>
    </View>
  );
}

function ChecklistRow(props: {
  title: string;
  pendingHint: string;
  doneHint: string;
  done: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  // Permissão já concedida não precisa de ação; "Escolher apps" continua tocável para editar a lista.
  const pressable = !props.done || props.title === 'Escolher apps';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!pressable}
      onPress={props.onPress}
      style={[styles.row, !props.last && styles.rowDivider]}>
      {props.done ? (
        <View style={styles.checkDone}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : (
        <View style={styles.checkPending} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{props.title}</Text>
        <Text style={[styles.rowHint, props.done && styles.rowHintDone]}>
          {props.done ? props.doneHint : props.pendingHint}
        </Text>
      </View>
      {pressable && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 20, gap: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  center: { textAlign: 'center' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  rowHint: { fontSize: 13, color: colors.textMuted },
  rowHintDone: { color: colors.success },
  checkDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  checkPending: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.iconMuted },
  chevron: { fontSize: 28, color: colors.textMuted, marginTop: -4 },
  spacer: { flex: 1 },
  footer: { gap: 12 },
  disabledButton: {
    height: 58,
    borderRadius: radius.button,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButtonText: { fontSize: 17, fontWeight: '600', color: colors.textMuted },
});
