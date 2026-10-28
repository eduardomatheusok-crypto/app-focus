import { useCallback, useEffect, useState } from 'react';
import { AppState, Button, StyleSheet, Text, View } from 'react-native';

import Blocker from '../../modules/modo-foco-blocker';

type Status = { usage: boolean; overlay: boolean };

function readStatus(): Status {
  return {
    usage: Blocker.hasUsagePermission(),
    overlay: Blocker.hasOverlayPermission(),
  };
}

export default function PermissionsScreen() {
  const [status, setStatus] = useState<Status>(readStatus);

  const refresh = useCallback(() => setStatus(readStatus()), []);

  // O usuário concede as permissões em outra tela (Configurações); ao voltar, o app fica 'active'.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <View style={styles.container}>
      <PermissionRow
        title="Acesso ao uso"
        description="Permite saber qual app está aberto."
        granted={status.usage}
        onPress={() => Blocker.openUsageSettings()}
      />
      <PermissionRow
        title="Sobrepor a outros apps"
        description="Permite mostrar a tela de foco por cima do app bloqueado."
        granted={status.overlay}
        onPress={() => Blocker.openOverlaySettings()}
      />
    </View>
  );
}

function PermissionRow(props: {
  title: string;
  description: string;
  granted: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>
        {props.granted ? '✅' : '❌'} {props.title}
      </Text>
      <Text style={styles.rowDescription}>{props.description}</Text>
      {!props.granted && <Button title="Abrir Configurações" onPress={props.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  row: { gap: 8 },
  rowTitle: { fontSize: 18, fontWeight: '600' },
  rowDescription: { fontSize: 14, color: '#666' },
});
