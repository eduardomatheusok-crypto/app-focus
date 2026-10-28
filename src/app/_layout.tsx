import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Modo Foco' }} />
      <Stack.Screen name="permissions" options={{ title: 'Permissões' }} />
      <Stack.Screen name="apps" options={{ title: 'Apps bloqueados' }} />
      <Stack.Screen name="session" options={{ title: 'Sessão de foco' }} />
    </Stack>
  );
}
