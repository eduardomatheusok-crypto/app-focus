import { Image, StyleSheet, Text, View } from 'react-native';

import type { LaunchableApp } from '../../modules/modo-foco-blocker';
import { colors } from '@/constants/theme';

type Props = {
  apps: LaunchableApp[];
  size: number;
  /** Quantos ícones mostrar; o restante vira um "+N" (se showOverflow). */
  max: number;
  showOverflow?: boolean;
};

export function AppIcons({ apps, size, max, showOverflow = false }: Props) {
  const visible = apps.slice(0, max);
  const hidden = apps.length - visible.length;
  const tile = { width: size, height: size, borderRadius: size / 4 };

  return (
    <View style={styles.row}>
      {visible.map((app) => (
        <Image
          key={app.packageName}
          accessibilityLabel={app.label}
          source={{ uri: `data:image/png;base64,${app.icon}` }}
          style={tile}
        />
      ))}
      {showOverflow && hidden > 0 && (
        <View style={[tile, styles.more]}>
          <Text style={styles.moreText}>+{hidden}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  more: { backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
