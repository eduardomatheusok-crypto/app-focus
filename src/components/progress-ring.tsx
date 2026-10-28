import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  size: number;
  thickness: number;
  /** De 0 a 1: quanto do anel aparece preenchido, em sentido horário a partir do topo. */
  progress: number;
  color: string;
  trackColor: string;
  fillColor: string;
  children?: ReactNode;
};

/**
 * Anel de progresso feito só com Views (sem SVG), para não precisar de biblioteca nativa.
 *
 * Técnica das "duas metades": cada metade da tela recorta (overflow hidden) um círculo
 * com borda colorida em só metade dele. Girando esse círculo, o arco aparece aos poucos
 * dentro do recorte: a metade direita mostra 0–50% e a esquerda, 50–100%.
 */
export function ProgressRing(props: Props) {
  const { size, thickness, color, trackColor, fillColor, children } = props;
  const progress = Math.min(1, Math.max(0, props.progress));
  const half = size / 2;

  // Círculo com as bordas esquerda e superior coloridas. Girado -45°, ele cobre exatamente a metade esquerda.
  const arc: ViewStyle = {
    position: 'absolute',
    top: 0,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderColor: 'transparent',
    borderLeftColor: color,
    borderTopColor: color,
  };

  const rightDegrees = -45 + Math.min(progress, 0.5) * 360;
  const leftDegrees = 135 + Math.max(progress - 0.5, 0) * 360;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: half, borderWidth: thickness, borderColor: trackColor, backgroundColor: fillColor },
        ]}
      />

      {progress > 0 && (
        <View style={[styles.clip, { left: half, width: half, height: size }]}>
          <View style={[arc, { left: -half, transform: [{ rotate: `${rightDegrees}deg` }] }]} />
        </View>
      )}

      {progress > 0.5 && (
        <View style={[styles.clip, { left: 0, width: half, height: size }]}>
          <View style={[arc, { left: 0, transform: [{ rotate: `${leftDegrees}deg` }] }]} />
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
