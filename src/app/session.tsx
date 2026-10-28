import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Button,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Blocker from '../../modules/modo-foco-blocker';
import { loadBlockedApps, loadSessionEndsAt, saveSessionEndsAt } from '@/lib/storage';

const DURATIONS_MIN = [1, 2, 5, 25, 50];

export default function SessionScreen() {
  const [duration, setDuration] = useState(2);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Retoma uma sessão em andamento (o serviço nativo pode estar rodando com o app fechado).
  useEffect(() => {
    const sync = () => {
      loadSessionEndsAt().then((saved) => {
        if (saved && saved > Date.now() && Blocker.isBlocking()) {
          setEndsAt(saved);
        } else {
          setEndsAt(null);
          saveSessionEndsAt(null);
        }
      });
    };
    sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, []);

  // Contagem regressiva na tela; o fim real da sessão é controlado pelo serviço nativo.
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        setEndsAt(null);
        saveSessionEndsAt(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  async function start() {
    if (!Blocker.hasUsagePermission() || !Blocker.hasOverlayPermission()) {
      Alert.alert('Faltam permissões', 'Conceda as duas permissões antes de iniciar.', [
        { text: 'Abrir permissões', onPress: () => router.push('/permissions') },
      ]);
      return;
    }

    const packages = await loadBlockedApps();
    if (packages.length === 0) {
      Alert.alert('Nenhum app escolhido', 'Escolha pelo menos um app para bloquear.', [
        { text: 'Escolher apps', onPress: () => router.push('/apps') },
      ]);
      return;
    }

    // Android 13+: sem esta permissão o bloqueio funciona, mas a notificação não aparece.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const sessionEndsAt = Date.now() + duration * 60_000;
    Blocker.startBlocking(packages, sessionEndsAt);
    await saveSessionEndsAt(sessionEndsAt);
    setNow(Date.now());
    setEndsAt(sessionEndsAt);
  }

  async function stop() {
    Blocker.stopBlocking();
    await saveSessionEndsAt(null);
    setEndsAt(null);
  }

  if (endsAt !== null) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Em foco</Text>
        <Text style={styles.countdown}>{formatRemaining(endsAt - now)}</Text>
        <Button title="Encerrar sessão" color="#C0392B" onPress={stop} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Duração da sessão</Text>
      <View style={styles.durations}>
        {DURATIONS_MIN.map((min) => (
          <Pressable
            key={min}
            onPress={() => setDuration(min)}
            style={[styles.chip, duration === min && styles.chipSelected]}>
            <Text style={[styles.chipText, duration === min && styles.chipTextSelected]}>
              {min} min
            </Text>
          </Pressable>
        ))}
      </View>
      <Button title="Iniciar foco" onPress={start} />
    </View>
  );
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24, justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  countdown: { fontSize: 64, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#208AEF' },
  chipSelected: { backgroundColor: '#208AEF' },
  chipText: { color: '#208AEF', fontSize: 16 },
  chipTextSelected: { color: '#fff' },
});
