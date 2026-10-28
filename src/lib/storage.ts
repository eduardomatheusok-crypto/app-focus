import AsyncStorage from '@react-native-async-storage/async-storage';

const BLOCKED_APPS_KEY = 'modo-foco:blocked-apps';
const SESSION_KEY = 'modo-foco:session';

export type Session = { startedAt: number; endsAt: number };

export async function loadSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function saveSession(session: Session | null): Promise<void> {
  if (session === null) await AsyncStorage.removeItem(SESSION_KEY);
  else await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadBlockedApps(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(BLOCKED_APPS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function saveBlockedApps(packages: string[]): Promise<void> {
  await AsyncStorage.setItem(BLOCKED_APPS_KEY, JSON.stringify(packages));
}
