import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Clipboard, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VaultSectionTabs, { VaultSection } from '../components/VaultSectionTabs';
import KryptixSphereLogo from '../components/KryptixSphereLogo';
import KryptixBackupModal from '../components/KryptixBackupModal';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { languageMeta, useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import DashboardScreen from './DashboardScreen';
import HardcodedPasswordPanel from './panels/HardcodedPasswordPanel';
import RecoveryPhrasesPanel from './panels/RecoveryPhrasesPanel';

type SettingsView = 'main' | 'theme' | 'language';
type HelpView = 'main' | 'faq' | 'about' | 'support';

const SUPPORT_WALLET = '0xe9e9603Ca0677669b2bFd02AC4eE286e2764AA33';

const FAQ_KEYS: { q: TranslationKey; a: TranslationKey }[] = [
  { q: 'faq1q', a: 'faq1a' },
  { q: 'faq2q', a: 'faq2a' },
  { q: 'faq3q', a: 'faq3a' },
  { q: 'faq4q', a: 'faq4a' },
  { q: 'faq5q', a: 'faq5a' },
  { q: 'faq6q', a: 'faq6a' },
];

const VaultHomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [section, setSection] = useState<VaultSection>('passwords');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');
  const [showHelp, setShowHelp] = useState(false);
  const [helpView, setHelpView] = useState<HelpView>('main');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [walletCopied, setWalletCopied] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const themeOptions: { key: ThemeMode; labelKey: TranslationKey; icon: string }[] = useMemo(
    () => [
      { key: 'light', labelKey: 'light', icon: '☀️' },
      { key: 'dark', labelKey: 'dark', icon: '🌙' },
      { key: 'system', labelKey: 'system', icon: '📱' },
    ],
    []
  );

  const themeLabel =
    mode === 'light' ? t('light') : mode === 'dark' ? t('dark') : t('system');
  const languageMetaEntry = languageMeta.find((m) => m.code === language);
  const languageLabel = languageMetaEntry?.nativeName ?? 'English';
  const usePlainTitleFont =
    language === 'fa' ||
    language === 'zh' ||
    language === 'ru' ||
    language === 'ar' ||
    language === 'ja' ||
    language === 'el' ||
    language === 'ko';

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

  const openGithub = () => Linking.openURL('https://github.com/nima-mehr/Kryptix');
  const openEmail = () =>
    Linking.openURL('mailto:N.mehr27@gmail.com?subject=Kryptix%20support');

  const copyWallet = () => {
    Clipboard.setString(SUPPORT_WALLET);
    setWalletCopied(true);
    setTimeout(() => setWalletCopied(false), 1500);
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
            <View style={styles.logoWrap}>
              <KryptixSphereLogo size={32} />
            </View>
            <Text
              style={[
                styles.title,
                { color: colors.text },
                usePlainTitleFont && {
                  fontFamily: undefined,
                  letterSpacing: 0,
                  fontSize: 16,
                  fontWeight: '700',
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {t('vaultTitle')}
            </Text>
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
              accessibilityLabel={t('helpAndFaq')}
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
              accessibilityLabel={t('settings')}
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.logoutBtn}>
              <Text style={[styles.logoutText, { color: colors.tint }]} numberOfLines={1}>
                {t('logout')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showHelp && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {helpView === 'main' && (
              <>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{t('help')}</Text>
                <TouchableOpacity style={styles.row} onPress={() => setHelpView('faq')}>
                  <Text style={{ fontSize: 16 }}>❓</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('faq')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={() => setHelpView('about')}>
                  <Text style={{ fontSize: 16 }}>ℹ️</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('about')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={() => setHelpView('support')}>
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('developerSupport')}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {helpView === 'faq' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setHelpView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>{t('backHelp')}</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{t('faq')}</Text>
                {FAQ_KEYS.map((item, index) => {
                  const open = expandedFaq === index;
                  return (
                    <View key={item.q}>
                      <TouchableOpacity
                        style={styles.row}
                        onPress={() => setExpandedFaq(open ? null : index)}
                      >
                        <Text style={[styles.rowLabel, { color: colors.text }]}>{t(item.q)}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                          {open ? '▾' : '›'}
                        </Text>
                      </TouchableOpacity>
                      {open && (
                        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                          {t(item.a)}
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
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>{t('backHelp')}</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{t('about')}</Text>
                <View style={styles.aboutBlock}>
                  <Text style={[styles.aboutName, { color: colors.text }]}>{t('aboutName')}</Text>
                  <Text style={[styles.aboutLine, { color: colors.textSecondary }]}>
                    {t('aboutVersion')}
                  </Text>
                  <Text style={[styles.aboutBody, { color: colors.textSecondary }]}>{t('aboutBody')}</Text>
                </View>
              </>
            )}

            {helpView === 'support' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setHelpView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>{t('backHelp')}</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>
                  {t('developerSupport')}
                </Text>
                <Text style={[styles.supportIntro, { color: colors.textSecondary }]}>
                  {t('supportIntro')}
                </Text>
                <TouchableOpacity style={styles.row} onPress={openGithub}>
                  <Text style={{ fontSize: 16 }}>📦</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('githubRepo')}</Text>
                  <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>{t('open')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={openEmail}>
                  <Text style={{ fontSize: 16 }}>✉️</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('emailDeveloper')}</Text>
                  <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>{t('mail')}</Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary, paddingTop: 8 }]}>
                  {t('donateEthUsdt')}
                </Text>
                <View style={styles.walletBlock}>
                  <Text style={[styles.walletHint, { color: colors.textSecondary }]}>
                    {t('walletHint')}
                  </Text>
                  <Text
                    style={[styles.walletAddress, { color: colors.text, borderColor: colors.border }]}
                    selectable
                  >
                    {SUPPORT_WALLET}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.copyWalletBtn,
                      {
                        backgroundColor: walletCopied
                          ? colors.successBackground || colors.tint + '22'
                          : colors.tint + '18',
                      },
                    ]}
                    onPress={copyWallet}
                  >
                    <Text
                      style={{
                        color: walletCopied ? colors.success || colors.tint : colors.tint,
                        fontWeight: '700',
                        fontSize: 14,
                      }}
                    >
                      {walletCopied ? t('copied') : t('copyAddress')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {showSettings && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {settingsView === 'main' && (
              <>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{t('settings')}</Text>
                <TouchableOpacity style={styles.row} onPress={() => setSettingsView('theme')}>
                  <Text style={{ fontSize: 16 }}>🎨</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('theme')}</Text>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{themeLabel}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row} onPress={() => setSettingsView('language')}>
                  <Text style={{ fontSize: 16 }}>🌐</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{t('language')}</Text>
                  <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{languageLabel}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    setShowSettings(false);
                    setShowBackup(true);
                  }}
                >
                  <Text style={{ fontSize: 16 }}>💾</Text>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Backup (.kryptix)</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {settingsView === 'theme' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setSettingsView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>
                    {t('backSettings')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{t('theme')}</Text>
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
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{t(opt.labelKey)}</Text>
                    {mode === opt.key && <Text style={{ color: colors.tint }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {settingsView === 'language' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setSettingsView('main')}>
                  <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 15 }}>
                    {t('backSettings')}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{t('language')}</Text>
                {languageMeta.map((lang) => {
                  const active = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.row, active && { backgroundColor: colors.tint + '22' }]}
                      onPress={async () => {
                        await setLanguage(lang.code);
                        closeSettings();
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{lang.flag}</Text>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>{lang.nativeName}</Text>
                      {active && <Text style={{ color: colors.tint }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
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

      <KryptixBackupModal visible={showBackup} onClose={() => setShowBackup(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  logoWrap: {
    flexShrink: 0,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 18,
    fontFamily: 'Orbitron',
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIcon: { fontSize: 17, fontWeight: '700' },
  logoutBtn: {
    maxWidth: 110,
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
  backRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 14, fontWeight: '500' },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -4,
  },
  aboutBlock: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
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
  walletBlock: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  walletHint: { fontSize: 13, marginBottom: 8 },
  walletAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  copyWalletBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});

export default VaultHomeScreen;
