import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Blocker, { type LaunchableApp } from '../../modules/modo-foco-blocker';
import { colors } from '@/constants/theme';
import { loadBlockedApps, saveBlockedApps } from '@/lib/storage';

export default function AppsScreen() {
  const [apps, setApps] = useState<LaunchableApp[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([Blocker.getLaunchableApps(), loadBlockedApps()]).then(([list, saved]) => {
      setApps(list);
      setSelected(new Set(saved));
    });
  }, []);

  function toggle(packageName: string) {
    const next = new Set(selected);
    if (next.has(packageName)) next.delete(packageName);
    else next.add(packageName);
    setSelected(next);
    saveBlockedApps([...next]);
  }

  if (!apps) {
    return <ActivityIndicator style={styles.loading} size="large" />;
  }

  return (
    <FlatList
      data={apps}
      keyExtractor={(app) => app.packageName}
      ListHeaderComponent={
        <Text style={styles.header}>{selected.size} app(s) bloqueado(s) durante o foco</Text>
      }
      renderItem={({ item }) => (
        <AppRow app={item} checked={selected.has(item.packageName)} onPress={toggle} />
      )}
    />
  );
}

function AppRow(props: {
  app: LaunchableApp;
  checked: boolean;
  onPress: (packageName: string) => void;
}) {
  return (
    <Pressable style={styles.row} onPress={() => props.onPress(props.app.packageName)}>
      <Image source={{ uri: `data:image/png;base64,${props.app.icon}` }} style={styles.icon} />
      <View style={styles.rowText}>
        <Text style={styles.label}>{props.app.label}</Text>
        <Text style={styles.packageName}>{props.app.packageName}</Text>
      </View>
      <View style={[styles.checkbox, props.checked && styles.checkboxChecked]}>
        {props.checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1 },
  header: { padding: 16, fontSize: 14, color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  icon: { width: 40, height: 40 },
  rowText: { flex: 1 },
  label: { fontSize: 16 },
  packageName: { fontSize: 12, color: '#888' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent },
  checkmark: { color: '#fff', fontWeight: '700' },
});
