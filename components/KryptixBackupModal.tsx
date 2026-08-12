import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { KryptixImportMode, KryptixSectionFlags, KryptixVaultFile, KryptixVaultPayload } from '../types/kryptixVault';
import {
  commitKryptixImport,
  decryptPickedKryptix,
  exportKryptixVault,
  getSectionCounts,
  pickKryptixFile,
} from '../utils/kryptixBackup';

type Mode = 'menu' | 'export' | 'import';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** When opened from passwords Import/Export, jump straight to that flow */
  initialMode?: Mode;
};

const IOS_SHARE_STEPS = [
  'After you tap Encrypt & share, the iOS share sheet opens with your .kryptix file.',
  'To keep a local copy: swipe the app row and choose Save to Files → pick On My iPhone / iCloud Drive → Save.',
  'To send to another device: use AirDrop, Mail, or Messages. Only share with people you trust — the file is encrypted, but the passphrase is still required to open it.',
  'To import later: open Kryptix → Settings → Backup → Import .kryptix → Choose file → browse Files app and select the .kryptix backup.',
  'Tip: remember your export passphrase separately. Without it the backup cannot be decrypted.',
];

const ANDROID_SHARE_HINT =
  'On Android the system share sheet appears after export. Choose Files, Drive, or another app to store the .kryptix backup.';

const KryptixBackupModal = ({ visible, onClose, initialMode = 'menu' }: Props) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState({ passwords: 0, recovery: 0, hardcoded: 0 });
  const [showShareGuide, setShowShareGuide] = useState(false);

  const [sections, setSections] = useState<KryptixSectionFlags>({
    passwords: true,
    recovery: true,
    hardcoded: true,
  });
  const [passphrase, setPassphrase] = useState('');
  const [passphrase2, setPassphrase2] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [picked, setPicked] = useState<{ file: KryptixVaultFile; name: string } | null>(null);
  const [payload, setPayload] = useState<KryptixVaultPayload | null>(null);
  const [importMode, setImportMode] = useState<KryptixImportMode>('merge');

  // When launched for a single purpose, hide the menu and the opposite flow
  const lockedToImport = initialMode === 'import';
  const lockedToExport = initialMode === 'export';

  useEffect(() => {
    if (!visible) return;
    setMode(initialMode);
    setBusy(false);
    setPassphrase('');
    setPassphrase2('');
    setShowPass(false);
    setPicked(null);
    setPayload(null);
    setImportMode('merge');
    setShowShareGuide(false);
    setSections({ passwords: true, recovery: true, hardcoded: true });
    getSectionCounts().then(setCounts).catch(() => {});
  }, [visible, initialMode]);

  const toggleSection = (key: keyof KryptixSectionFlags) => {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const close = () => {
    if (busy) return;
    onClose();
  };

  const goBack = () => {
    // When locked to one flow, back closes the modal instead of showing the menu
    if (lockedToImport || lockedToExport) {
      close();
      return;
    }
    setMode('menu');
    setPicked(null);
    setPayload(null);
  };

  const runExport = async () => {
    if (!sections.passwords && !sections.recovery && !sections.hardcoded) {
      Alert.alert(t('error'), 'Select at least one section');
      return;
    }
    if (passphrase.length < 4) {
      Alert.alert(t('error'), 'Passphrase must be at least 4 characters');
      return;
    }
    if (passphrase !== passphrase2) {
      Alert.alert(t('error'), 'Passphrases do not match');
      return;
    }
    setBusy(true);
    try {
      await exportKryptixVault(sections, passphrase);
      Alert.alert(
        t('success'),
        Platform.OS === 'ios'
          ? 'Share sheet opened. Use Save to Files to keep the .kryptix backup on this device.'
          : 'Encrypted .kryptix file ready to share.'
      );
      onClose();
    } catch (e: any) {
      Alert.alert(t('exportFailed'), e?.message || t('couldNotExport'));
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    setBusy(true);
    try {
      const result = await pickKryptixFile();
      if (!result) return;
      setPicked(result);
      setPayload(null);
      setPassphrase('');
      setSections({
        passwords: result.file.meta?.includePasswords !== false,
        recovery: result.file.meta?.includeRecovery !== false,
        hardcoded: result.file.meta?.includeHardcoded !== false,
      });
    } catch (e: any) {
      Alert.alert(t('importFailed'), e?.message || t('couldNotImport'));
    } finally {
      setBusy(false);
    }
  };

  const unlockFile = async () => {
    if (!picked) return;
    if (!passphrase) {
      Alert.alert(t('error'), 'Enter the export passphrase');
      return;
    }
    setBusy(true);
    try {
      const data = await decryptPickedKryptix(picked.file, passphrase);
      setPayload(data);
    } catch (e: any) {
      Alert.alert(t('importFailed'), e?.message || 'Could not decrypt file');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    if (!payload) return;
    if (!sections.passwords && !sections.recovery && !sections.hardcoded) {
      Alert.alert(t('error'), 'Select at least one section to import');
      return;
    }
    if (importMode === 'replaceSections') {
      Alert.alert(
        'Replace sections?',
        'Selected sections on this device will be overwritten by the file. This cannot be undone.',
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('ok'),
            style: 'destructive',
            onPress: () => doImport(),
          },
        ]
      );
      return;
    }
    await doImport();
  };

  const doImport = async () => {
    if (!payload) return;
    setBusy(true);
    try {
      const result = await commitKryptixImport(payload, sections, importMode);
      const lines = [
        sections.passwords
          ? `Passwords — imported ${result.passwords.imported}, skipped ${result.passwords.skipped}`
          : null,
        sections.recovery
          ? `Recovery — imported ${result.recovery.imported}, skipped ${result.recovery.skipped}`
          : null,
        sections.hardcoded
          ? `Hardcoded — imported ${result.hardcoded.imported}, skipped ${result.hardcoded.skipped}`
          : null,
      ].filter(Boolean);
      Alert.alert(t('importComplete'), lines.join('\n'));
      onClose();
    } catch (e: any) {
      Alert.alert(t('importFailed'), e?.message || t('couldNotImport'));
    } finally {
      setBusy(false);
    }
  };

  const SectionRow = ({
    label,
    count,
    sectionKey,
  }: {
    label: string;
    count?: number;
    sectionKey: keyof KryptixSectionFlags;
  }) => {
    const on = sections[sectionKey];
    return (
      <TouchableOpacity style={styles.sectionRow} onPress={() => toggleSection(sectionKey)}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.tint,
              backgroundColor: on ? colors.tint : 'transparent',
            },
          ]}
        >
          {on ? <Text style={styles.check}>✓</Text> : null}
        </View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {label}
          {typeof count === 'number' ? ` (${count})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const ShareSheetGuide = () => (
    <View
      style={[
        styles.guideBox,
        { backgroundColor: colors.tint + '12', borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.guideHeader}
        onPress={() => setShowShareGuide((v) => !v)}
        accessibilityRole="button"
      >
        <Text style={[styles.guideTitle, { color: colors.text }]}>
          {Platform.OS === 'ios' ? 'iOS share sheet guide' : 'Share sheet guide'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          {showShareGuide ? '▾' : '›'}
        </Text>
      </TouchableOpacity>
      {showShareGuide && (
        <View style={styles.guideBody}>
          {Platform.OS === 'ios' ? (
            IOS_SHARE_STEPS.map((step, i) => (
              <View key={i} style={styles.guideStepRow}>
                <Text style={[styles.guideStepNum, { color: colors.tint }]}>{i + 1}.</Text>
                <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>{step}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.guideStepText, { color: colors.textSecondary }]}>
              {ANDROID_SHARE_HINT}
              {'\n\n'}
              For iPhone/iPad: Save to Files is the safest way to keep a local backup. AirDrop or Mail work for moving the file; always use a strong export passphrase.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {mode === 'menu' && !lockedToImport && !lockedToExport && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Kryptix backup</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  Encrypted .kryptix file for full vault transfer (mobile, desktop, extension).
                </Text>
                <ShareSheetGuide />
                <TouchableOpacity
                  style={[styles.menuBtn, { borderColor: colors.border, backgroundColor: colors.inputBackground || colors.card }]}
                  onPress={() => setMode('export')}
                >
                  <Text style={[styles.menuBtnText, { color: colors.text }]}>Export .kryptix</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.menuBtn, { borderColor: colors.border, backgroundColor: colors.inputBackground || colors.card }]}
                  onPress={() => setMode('import')}
                >
                  <Text style={[styles.menuBtnText, { color: colors.text }]}>Import .kryptix</Text>
                </TouchableOpacity>
              </>
            )}

            {mode === 'export' && (
              <>
                <TouchableOpacity onPress={goBack} style={{ marginBottom: 8 }}>
                  <Text style={{ color: colors.tint, fontWeight: '600' }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Export .kryptix</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  Choose sections and an export passphrase (can differ from master password).
                </Text>

                <ShareSheetGuide />

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sections</Text>
                <SectionRow label={t('tabPasswords')} count={counts.passwords} sectionKey="passwords" />
                <SectionRow label={t('tabRecovery')} count={counts.recovery} sectionKey="recovery" />
                <SectionRow label={t('tabHardcoded')} count={counts.hardcoded} sectionKey="hardcoded" />

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Passphrase</Text>
                <TextInput
                  value={passphrase}
                  onChangeText={setPassphrase}
                  placeholder="Export passphrase"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPass}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
                <TextInput
                  value={passphrase2}
                  onChangeText={setPassphrase2}
                  placeholder="Confirm passphrase"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPass}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.tint, fontWeight: '600' }}>
                    {showPass ? t('hide') : t('show')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 }]}
                  onPress={runExport}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Encrypt & share</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {mode === 'import' && (
              <>
                <TouchableOpacity onPress={goBack} style={{ marginBottom: 8 }}>
                  <Text style={{ color: colors.tint, fontWeight: '600' }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Import .kryptix</Text>
                <Text style={[styles.sub, { color: colors.textSecondary }]}>
                  {Platform.OS === 'ios'
                    ? 'Choose file opens the document picker. Browse the Files app for a .kryptix backup you saved earlier.'
                    : 'Choose a .kryptix backup from your device storage.'}
                </Text>

                {!picked && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 }]}
                    onPress={pickFile}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Choose file</Text>
                    )}
                  </TouchableOpacity>
                )}

                {picked && !payload && (
                  <>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>
                      File: {picked.name}
                      {picked.file.meta
                        ? `\nContains: ${picked.file.meta.counts?.passwords ?? 0} passwords, ${picked.file.meta.counts?.recovery ?? 0} recovery, ${picked.file.meta.counts?.hardcoded ?? 0} hardcoded`
                        : ''}
                    </Text>
                    <TextInput
                      value={passphrase}
                      onChangeText={setPassphrase}
                      placeholder="Export passphrase"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPass}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                    <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={{ marginBottom: 12 }}>
                      <Text style={{ color: colors.tint, fontWeight: '600' }}>
                        {showPass ? t('hide') : t('show')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 }]}
                      onPress={unlockFile}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Decrypt</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {payload && (
                  <>
                    <Text style={[styles.sub, { color: colors.textSecondary }]}>
                      Decrypted: {payload.passwords.length} passwords,{' '}
                      {payload.recoveryPhrases.length} recovery, {payload.hardcoded.length} hardcoded
                    </Text>

                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Import sections</Text>
                    <SectionRow
                      label={t('tabPasswords')}
                      count={payload.passwords.length}
                      sectionKey="passwords"
                    />
                    <SectionRow
                      label={t('tabRecovery')}
                      count={payload.recoveryPhrases.length}
                      sectionKey="recovery"
                    />
                    <SectionRow
                      label={t('tabHardcoded')}
                      count={payload.hardcoded.length}
                      sectionKey="hardcoded"
                    />

                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mode</Text>
                    <TouchableOpacity
                      style={[styles.modeRow, importMode === 'merge' && { backgroundColor: colors.tint + '22' }]}
                      onPress={() => setImportMode('merge')}
                    >
                      <Text style={[styles.sectionLabel, { color: colors.text }]}>Merge (skip duplicates)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modeRow,
                        importMode === 'replaceSections' && { backgroundColor: colors.tint + '22' },
                      ]}
                      onPress={() => setImportMode('replaceSections')}
                    >
                      <Text style={[styles.sectionLabel, { color: colors.text }]}>
                        Replace selected sections
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: busy ? 0.6 : 1 }]}
                      onPress={runImport}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Import into vault</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={close} disabled={busy}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '88%',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  guideBox: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  guideTitle: { fontSize: 14, fontWeight: '700', flex: 1, paddingRight: 8 },
  guideBody: { paddingHorizontal: 14, paddingBottom: 14 },
  guideStepRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  guideStepNum: { fontSize: 13, fontWeight: '800', width: 18 },
  guideStepText: { flex: 1, fontSize: 13, lineHeight: 19 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  modeRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 13, fontWeight: '800' },
  sectionLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  menuBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
  },
  menuBtnText: { fontWeight: '700', fontSize: 15 },
});

export default KryptixBackupModal;
