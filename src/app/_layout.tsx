import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="apps" options={{ title: 'Apps bloqueados' }} />
    </Stack>
  );
}
