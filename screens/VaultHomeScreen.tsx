import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VaultSectionTabs, { VaultSection } from '../components/VaultSectionTabs';
import KryptixSphereLogo from '../components/KryptixSphereLogo';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import DashboardScreen from './DashboardScreen';
import HardcodedPasswordPanel from './panels/HardcodedPasswordPanel';
import RecoveryPhrasesPanel from './panels/RecoveryPhrasesPanel';

type SettingsView = 'main' | 'theme' | 'language';
type HelpView = 'main' | 'faq' | 'about' | 'support';

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Is my data stored online?',
    a: 'No. Kryptix keeps passwords and recovery phrases only on this device. Nothing is uploaded to a server.',
  },
  {
    q: 'What if I forget my master password?',
    a: 'There is no cloud recovery. Without your master password you cannot unlock the vault. Store it somewhere safe offline.',
  },
  {
    q: 'How do I import or export?',
    a: 'In the Passwords section use Import / Export. You can export as JSON or CSV for backup or moving to another device.',
  },
  {
    q: 'What are recovery phrases for?',
    a: 'Use the Recovery phrases tab to store wallet seed phrases (12 or 24 words) separately from regular logins.',
  },
  {
    q: 'Can I use Face ID / fingerprint?',
    a: 'Yes. After unlocking with your password once, you can enable biometrics from the login screen for faster unlocks.',
  },
];

/**
 * Top-level vault shell: shared header + section tabs for every section.
 * Settings menu holds Theme, Language, and room for more options.
 * Help (?) menu holds FAQ, About, and developer support.
 */
const VaultHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const [section, setSection] = useState<VaultSection>('passwords');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');
  const [showHelp, setShowHelp] = useState(false);
  const [helpView, setHelpView] = useState<HelpView>('main');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: '☀️' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '📱' },
  ];

  const themeLabel =
    mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

  const openSettings = () => {
    setShowHelp(false);
    setHelpView('main');
    setSettingsView('main');
    setShowSettings((v) => !v);
  };

  const closeSettings = () => {
    setShowSettings(false);
    setSettingsView('main');
  };

  const openHelp = () => {
    setShowSettings(false);
    setSettingsView('main');
    setHelpView('main');
    setExpandedFaq(null);
    setShowHelp((v) => !v);
  };

  const closeHelp = () => {
    setShowHelp(false);
    setHelpView('main');
    setExpandedFaq(null);
  };

  const openGithub = () => {
    Linking.openURL('https://github.com/nima-mehr/Kryptix');
  };

  const openEmail = () => {
    Linking.openURL('mailto:N.mehr27@gmail.com?subject=Kryptix%20support');
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
                styles.circleBtn,
                {
                  backgroundColor: showHelp ? colors.tint + '22' : colors.card,
                  borderColor: showHelp ? colors.tint : colors.border,
                },
              ]}
              onPress={openHelp}
              accessibilityLabel="Help and FAQ"
            >
              <Text style={[styles.helpIcon, { color: colors.text }]}>?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.circleBtn,
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

        {showHelp && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {helpView === 'main' && (
              <>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>Help</Text>
                <TouchableOpacity style={styles.row} onPress={() => setHelpView('faq')}>
                  <Text style={{ fontSize: 16 }}>❓</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>FAQ</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={() => setHelpView('about')}>
                  <Text style={{ fontSize: 16 }}>ℹ️</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>About</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={() => setHelpView('support')}>
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Developer support</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {helpView === 'faq' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setHelpView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Help</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>FAQ</Text>
                {FAQ_ITEMS.map((item, index) => {
                  const open = expandedFaq === index;
                  return (
                    <View key={item.q}>
                      <TouchableOpacity
                        style={styles.row}
                        onPress={() => setExpandedFaq(open ? null : index)}
                      >
                        <Text style={[styles.rowLabel, { color: colors.text }]}>{item.q}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                          {open ? '▾' : '›'}
                        </Text>
                      </TouchableOpacity>
                      {open && (
                        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                          {item.a}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {helpView === 'about' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setHelpView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Help</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>About</Text>
                <View style={styles.aboutBlock}>
                  <Text style={[styles.aboutName, { color: colors.text }]}>Kryptix Vault</Text>
                  <Text style={[styles.aboutLine, { color: colors.textSecondary }]}>Version 1.0.0</Text>
                  <Text style={[styles.aboutBody, { color: colors.textSecondary }]}>
                    Offline password manager for logins, recovery phrases, and emergency credentials.
                    Data stays on your device — no accounts, no cloud sync.
                  </Text>
                </View>
              </>
            )}

            {helpView === 'support' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setHelpView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Help</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>
                  Developer support
                </Text>
                <Text style={[styles.supportIntro, { color: colors.textSecondary }]}>
                  Found a bug or have a feature idea? Reach out below.
                </Text>
                <TouchableOpacity style={styles.row} onPress={openGithub}>
                  <Text style={{ fontSize: 16 }}>📦</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>GitHub repository</Text>
                  <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={openEmail}>
                  <Text style={{ fontSize: 16 }}>✉️</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Email developer</Text>
                  <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>Mail</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {showSettings && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {settingsView === 'main' && (
              <>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>Settings</Text>
                <TouchableOpacity style={styles.row} onPress={() => setSettingsView('theme')}>
                  <Text style={{ fontSize: 16 }}>🎨</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{themeLabel}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={() => setSettingsView('language')}>
                  <Text style={{ fontSize: 16 }}>🌐</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Language</Text>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>English</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {settingsView === 'theme' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setSettingsView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Settings</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>Theme</Text>
                {themeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.row, mode === opt.key && { backgroundColor: colors.tint + '22' }]}
                    onPress={() => {
                      setMode(opt.key);
                      closeSettings();
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{opt.label}</Text>
                    {mode === opt.key && <Text style={{ color: colors.tint }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {settingsView === 'language' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setSettingsView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>← Settings</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>Language</Text>
                <TouchableOpacity
                  style={[styles.row, { backgroundColor: colors.tint + '22' }]}
                  onPress={closeSettings}
                >
                  <Text style={{ fontSize: 16 }}>🇬🇧</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>English</Text>
                  <Text style={{ color: colors.tint }}>✓</Text>
                </TouchableOpacity>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIcon: {
    fontSize: 17,
    fontWeight: '700',
  },
  logoutText: { fontWeight: '600', fontSize: 15 },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14, fontWeight: '500' },
  hint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    fontStyle: 'italic',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -4,
  },
  aboutBlock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  aboutName: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  aboutLine: { fontSize: 13, marginBottom: 10 },
  aboutBody: { fontSize: 14, lineHeight: 21 },
  supportIntro: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
});

export default VaultHomeScreen;
