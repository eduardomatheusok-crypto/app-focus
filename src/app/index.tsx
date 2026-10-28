import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Telas de teste do bloqueio</Text>
      <Link href="/permissions" style={styles.link}>
        1. Permissões
      </Link>
      <Link href="/apps" style={styles.link}>
        2. Escolher apps
      </Link>
      <Link href="/session" style={styles.link}>
        3. Sessão de foco
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '600' },
  link: { fontSize: 18, color: '#208AEF', paddingVertical: 8 },
});
