import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Blocker, { type LaunchableApp } from '../../modules/modo-foco-blocker';
import { ReadyPanel } from '@/components/home/ready-panel';
import { SessionPanel } from '@/components/home/session-panel';
import { SetupPanel } from '@/components/home/setup-panel';
import { colors } from '@/constants/theme';
import { loadBlockedApps, loadSession, saveSession, type Session } from '@/lib/storage';

type Permissions = { usage: boolean; overlay: boolean };

function readPermissions(): Permissions {
  return { usage: Blocker.hasUsagePermission(), overlay: Blocker.hasOverlayPermission() };
}

// A lista completa de apps (com ícones) é pesada; carregamos uma vez e reaproveitamos.
let allAppsCache: Promise<LaunchableApp[]> | null = null;

async function loadBlockedAppInfo(): Promise<LaunchableApp[]> {
  allAppsCache ??= Blocker.getLaunchableApps();
  const [allApps, packages] = await Promise.all([allAppsCache, loadBlockedApps()]);
  const selected = new Set(packages);
  return allApps.filter((app) => selected.has(app.packageName));
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const [permissions, setPermissions] = useState<Permissions>(readPermissions);
  const [blockedApps, setBlockedApps] = useState<LaunchableApp[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [duration, setDuration] = useState(25);
  const [now, setNow] = useState(() => Date.now());

  // Relê tudo: ao voltar das Configurações, da tela de apps ou com o app reaberto.
  const refresh = useCallback(() => {
    setPermissions(readPermissions());
    loadBlockedAppInfo().then(setBlockedApps);
    loadSession().then((saved) => {
      // O serviço nativo é quem manda: se ele parou, a sessão salva não vale mais.
      if (saved && saved.endsAt > Date.now() && Blocker.isBlocking()) {
        setSession(saved);
      } else {
        setSession(null);
        saveSession(null);
      }
    });
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // Contagem regressiva; o fim real da sessão é controlado pelo serviço nativo.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= session.endsAt) {
        setSession(null);
        saveSession(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  async function start() {
    // Android 13+: sem esta permissão o bloqueio funciona, mas a notificação não aparece.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    const startedAt = Date.now();
    const next = { startedAt, endsAt: startedAt + duration * 60_000 };
    Blocker.startBlocking(
      blockedApps.map((app) => app.packageName),
      next.endsAt
    );
    await saveSession(next);
    setNow(startedAt);
    setSession(next);
  }

  function confirmStop() {
    if (!session) return;
    const minutesLeft = Math.ceil((session.endsAt - Date.now()) / 60_000);
    Alert.alert('Encerrar sessão?', `Faltam ${minutesLeft} min. Tudo bem parar agora.`, [
      { text: 'Continuar focando', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: async () => {
          Blocker.stopBlocking();
          await saveSession(null);
          setSession(null);
        },
      },
    ]);
  }

  const ready = permissions.usage && permissions.overlay && blockedApps.length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      {session ? (
        <>
          <View style={styles.titleRow}>
            <TargetIcon />
            <Text style={styles.title}>Em foco</Text>
          </View>
          <SessionPanel session={session} now={now} blockedApps={blockedApps} onStop={confirmStop} />
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{greeting()}</Text>
            <Text style={styles.subtitle}>{ready ? 'Pronto para estudar?' : 'Vamos preparar seu foco'}</Text>
          </View>
          {ready ? (
            <ReadyPanel
              duration={duration}
              onChangeDuration={setDuration}
              onStart={start}
              blockedApps={blockedApps}
              onEditApps={() => router.push('/apps')}
            />
          ) : (
            <SetupPanel
              usageGranted={permissions.usage}
              overlayGranted={permissions.overlay}
              blockedCount={blockedApps.length}
              onOpenUsage={() => Blocker.openUsageSettings()}
              onOpenOverlay={() => Blocker.openOverlaySettings()}
              onChooseApps={() => router.push('/apps')}
            />
          )}
        </>
      )}
    </View>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Ícone de "alvo" feito com círculos concêntricos. */
function TargetIcon() {
  return (
    <View style={[styles.targetRing, { width: 28, height: 28, borderRadius: 14 }]}>
      <View style={[styles.targetRing, { width: 14, height: 14, borderRadius: 7 }]}>
        <View style={styles.targetDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, backgroundColor: colors.background, gap: 28 },
  header: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 17, color: colors.textMuted },
  targetRing: {
    borderWidth: 2.4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
});
