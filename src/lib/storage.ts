import AsyncStorage from '@react-native-async-storage/async-storage';

const BLOCKED_APPS_KEY = 'modo-foco:blocked-apps';
const SESSION_ENDS_AT_KEY = 'modo-foco:session-ends-at';

export async function loadSessionEndsAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(SESSION_ENDS_AT_KEY);
  return raw ? Number(raw) : null;
}

export async function saveSessionEndsAt(endsAt: number | null): Promise<void> {
  if (endsAt === null) await AsyncStorage.removeItem(SESSION_ENDS_AT_KEY);
  else await AsyncStorage.setItem(SESSION_ENDS_AT_KEY, String(endsAt));
}

export async function loadBlockedApps(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(BLOCKED_APPS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function saveBlockedApps(packages: string[]): Promise<void> {
  await AsyncStorage.setItem(BLOCKED_APPS_KEY, JSON.stringify(packages));
}
