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

type SettingsView = 'main' | 'theme' | 'language';

/**
 * Top-level vault shell: shared header + section tabs for every section.
 * Settings menu holds Theme, Language, and room for more options.
 */
const VaultHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const [section, setSection] = useState<VaultSection>('passwords');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: '☀️' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '📱' },
  ];

  const themeLabel =
    mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

  const openSettings = () => {
    setSettingsView('main');
    setShowSettings((v) => !v);
  };

  const closeSettings = () => {
    setShowSettings(false);
    setSettingsView('main');
  };

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
              style={[
                styles.settingsBtn,
                {
                  backgroundColor: showSettings ? colors.tint + '22' : colors.card,
                  borderColor: showSettings ? colors.tint : colors.border,
                },
              ]}
              onPress={openSettings}
              accessibilityLabel="Settings"
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={[styles.logoutText, { color: colors.tint }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showSettings && (
          <View style={[styles.settingsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {settingsView === 'main' && (
              <>
                <Text style={[styles.settingsTitle, { color: colors.textSecondary }]}>Settings</Text>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => setSettingsView('theme')}
                >
                  <Text style={{ fontSize: 16 }}>🎨</Text>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Theme</Text>
                  <Text style={[styles.settingsRowValue, { color: colors.textSecondary }]}>
                    {themeLabel}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => setSettingsView('language')}
                >
                  <Text style={{ fontSize: 16 }}>🌐</Text>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Language</Text>
                  <Text style={[styles.settingsRowValue, { color: colors.textSecondary }]}>
                    English
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {settingsView === 'theme' && (
              <>
                <TouchableOpacity
                  style={styles.settingsBackRow}
                  onPress={() => setSettingsView('main')}
                >
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Settings</Text>
                </TouchableOpacity>
                <Text style={[styles.settingsTitle, { color: colors.textSecondary }]}>Theme</Text>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.settingsRow,
                      mode === opt.key && { backgroundColor: colors.tint + '22' },
                    ]}
                    onPress={() => {
                      setMode(opt.key);
                      closeSettings();
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                    <Text style={[styles.settingsRowLabel, { color: colors.text }]}>{opt.label}</Text>
                    {mode === opt.key && <Text style={{ color: colors.tint }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {settingsView === 'language' && (
              <>
                <TouchableOpacity
                  style={styles.settingsBackRow}
                  onPress={() => setSettingsView('main')}
                >
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Settings</Text>
                </TouchableOpacity>
                <Text style={[styles.settingsTitle, { color: colors.textSecondary }]}>Language</Text>
                <TouchableOpacity
                  style={[styles.settingsRow, { backgroundColor: colors.tint + '22' }]}
                  onPress={closeSettings}
                >
                  <Text style={{ fontSize: 16 }}>🇬🇧</Text>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>English</Text>
                  <Text style={{ color: colors.tint }}>✓</Text>
                </TouchableOpacity>
                <Text style={[styles.settingsHint, { color: colors.textSecondary }]}>
                  More languages coming soon.
                </Text>
              </>
            )}
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
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontWeight: '600', fontSize: 15 },
  settingsPanel: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  settingsBackRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingsRowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  settingsRowValue: { fontSize: 14, fontWeight: '500' },
  settingsHint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    fontStyle: 'italic',
  },
});

export default VaultHomeScreen;
