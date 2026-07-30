import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VaultSectionTabs, { VaultSection } from '../components/VaultSectionTabs';
import KryptixSphereLogo from '../components/KryptixSphereLogo';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import DashboardScreen from './DashboardScreen';
import HardcodedPasswordPanel from './panels/HardcodedPasswordPanel';
import RecoveryPhrasesPanel from './panels/RecoveryPhrasesPanel';

/**
 * Top-level vault shell: shared header + section tabs for every section.
 * Layout stays fixed when switching between Passwords / Recovery / Hardcoded.
 */
const VaultHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const [section, setSection] = useState<VaultSection>('passwords');
  const [showThemePicker, setShowThemePicker] = useState(false);

  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: '☀️' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '⚙️' },
  ];

  return (
    <View
      style={[
        styles.flex,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <View style={styles.pad}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <KryptixSphereLogo size={32} />
            <Text style={[styles.title, { color: colors.text }]}>KRYPTIX VAULT</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowThemePicker((v) => !v)}
            >
              <Text style={{ fontSize: 16 }}>
                {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '⚙️'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={[styles.logoutText, { color: colors.tint }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showThemePicker && (
          <View style={[styles.themePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.themeOption, mode === opt.key && { backgroundColor: colors.tint + '22' }]}
                onPress={() => {
                  setMode(opt.key);
                  setShowThemePicker(false);
                }}
              >
                <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                <Text style={[styles.themeOptionText, { color: colors.text }]}>{opt.label}</Text>
                {mode === opt.key && <Text style={{ color: colors.tint }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <VaultSectionTabs section={section} onChange={setSection} />
      </View>

      <View style={[styles.flex, section !== 'passwords' && styles.pad]}>
        {section === 'passwords' ? (
          <DashboardScreen embedded />
        ) : section === 'recovery' ? (
          <RecoveryPhrasesPanel />
        ) : (
          <HardcodedPasswordPanel />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Orbitron',
    letterSpacing: 1.5,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontWeight: '600', fontSize: 15 },
  themePicker: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  themeOptionText: { flex: 1, fontSize: 15, fontWeight: '500' },
});

export default VaultHomeScreen;
