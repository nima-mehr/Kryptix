import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Clipboard,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ENCRYPTION_OPTIONS,
  type EncryptionAlgorithm,
  type HardcodedPasswordEntry,
} from '../../types/hardcoded';
import { encryptPassword } from '../../utils/encryption';
import {
  addHardcodedPassword,
  deleteHardcodedPassword,
  loadHardcodedVault,
  updateHardcodedPassword,
} from '../../utils/hardcoded';

const ALGO_LABEL_KEY: Record<EncryptionAlgorithm, string> = {
  aes256: 'aes256',
  xor: 'xorPassphrase',
  base64: 'base64',
};
const ALGO_DESC_KEY: Record<EncryptionAlgorithm, string> = {
  aes256: 'aesDesc',
  xor: 'xorDesc',
  base64: 'base64Desc',
};

const HardcodedPasswordPanel = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [entries, setEntries] = useState<HardcodedPasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [notes, setNotes] = useState('');
  const [allowCopy, setAllowCopy] = useState(true);
  const [algorithm, setAlgorithm] = useState<EncryptionAlgorithm>('aes256');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showFormKey, setShowFormKey] = useState(false);
  const [previewCipher, setPreviewCipher] = useState('');
  const [showPreviewCipher, setShowPreviewCipher] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [decryptedIds, setDecryptedIds] = useState<Record<string, boolean>>({});
  const [visibleCipher, setVisibleCipher] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const isEditing = editingId !== null;
  const selectedAlgo = ENCRYPTION_OPTIONS.find((o) => o.value === algorithm)!;
  const needsKey = selectedAlgo.needsKey;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q) ||
        e.password.toLowerCase().includes(q) ||
        e.ciphertext.toLowerCase().includes(q) ||
        e.algorithm.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const refresh = useCallback(async () => {
    setEntries(await loadHardcodedVault());
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!password) {
        setPreviewCipher('');
        return;
      }
      if (needsKey && !encryptionKey) {
        setPreviewCipher('');
        return;
      }
      try {
        setEncrypting(true);
        const result = await encryptPassword(password, algorithm, encryptionKey);
        if (!cancelled) setPreviewCipher(result.ciphertext);
      } catch {
        if (!cancelled) setPreviewCipher('');
      } finally {
        if (!cancelled) setEncrypting(false);
      }
    };
    const timer = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password, algorithm, encryptionKey, needsKey]);

  const clearForm = () => {
    setName('');
    setPassword('');
    setEncryptionKey('');
    setNotes('');
    setAllowCopy(true);
    setAlgorithm('aes256');
    setShowFormPassword(false);
    setShowFormKey(false);
    setPreviewCipher('');
    setShowPreviewCipher(false);
    setEditingId(null);
  };

  const startEdit = (entry: HardcodedPasswordEntry) => {
    setEditingId(entry.id);
    setName(entry.name);
    setPassword(entry.password);
    setEncryptionKey(entry.encryptionKey);
    setNotes(entry.notes || '');
    setAllowCopy(entry.allowCopy);
    setAlgorithm(entry.algorithm);
    setShowFormPassword(false);
    setShowFormKey(false);
    setShowPreviewCipher(false);
    setConfirmingDeleteId(null);
  };

  const handleSave = async () => {
    if (!name.trim() || !password) {
      Alert.alert(t('error'), t('enterNameAndPassword'));
      return;
    }
    if (needsKey && !encryptionKey) {
      Alert.alert(t('error'), t('algoRequiresKey', { algo: t(ALGO_LABEL_KEY[algorithm]) }));
      return;
    }

    try {
      setEncrypting(true);
      const result = await encryptPassword(password, algorithm, encryptionKey);
      if (!result.ciphertext) {
        Alert.alert(t('error'), t('encryptionEmpty'));
        return;
      }

      const payload = {
        name: name.trim(),
        password,
        ciphertext: result.ciphertext,
        algorithm,
        encryptionKey: needsKey ? encryptionKey : '',
        iv: result.iv,
        allowCopy,
        notes: notes.trim() || undefined,
      };

      if (isEditing && editingId) {
        await updateHardcodedPassword(editingId, payload);
        setDecryptedIds((prev) => {
          const next = { ...prev };
          delete next[editingId];
          return next;
        });
      } else {
        await addHardcodedPassword(payload);
      }
      await refresh();
      clearForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('failedSavePassword');
      Alert.alert(t('error'), msg);
    } finally {
      setEncrypting(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteHardcodedPassword(id);
      await refresh();
      setConfirmingDeleteId(null);
      setDecryptedIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (editingId === id) clearForm();
    } catch {
      Alert.alert(t('error'), t('couldNotDeleteEntry'));
    }
  };

  const toggleFavorite = async (entry: HardcodedPasswordEntry) => {
    try {
      await updateHardcodedPassword(entry.id, { favorite: !entry.favorite });
      await refresh();
    } catch {
      Alert.alert(t('error'), t('couldNotUpdateFavorite'));
    }
  };

  const copyText = (text: string, id: string, allowed: boolean) => {
    if (!allowed) {
      Alert.alert(t('copyDisabled'), t('copyDisabledMsg'));
      return;
    }
    if (!text) return;
    Clipboard.setString(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const mask = (text: string, visible: boolean) => {
    if (visible) return text;
    if (!text) return '';
    if (text.length <= 8) return '••••••••';
    return text.slice(0, 4) + '•'.repeat(Math.min(text.length - 4, 24)) + (text.length > 28 ? '…' : '');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary }}>{t('loadingHardcoded')}</Text>
      </View>
    );
  }

  const listHeader = (
    <>
      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.danger + '55' }]}>
        {isEditing && (
          <View style={styles.editingBanner}>
            <Text style={[styles.editingText, { color: colors.danger }]}>{t('editingEntry')}</Text>
            <TouchableOpacity onPress={clearForm}>
              <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('copyPaste')}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              {
                borderColor: allowCopy ? colors.tint : colors.border,
                backgroundColor: allowCopy ? colors.tint + '18' : colors.inputBackground,
              },
            ]}
            onPress={() => setAllowCopy(true)}
          >
            <Text style={{ color: allowCopy ? colors.tint : colors.text, fontWeight: '600', fontSize: 13 }}>
              {t('allowCopy')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              {
                borderColor: !allowCopy ? colors.danger : colors.border,
                backgroundColor: !allowCopy ? colors.dangerBackground : colors.inputBackground,
              },
            ]}
            onPress={() => setAllowCopy(false)}
          >
            <Text
              style={{
                color: !allowCopy ? colors.danger : colors.text,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {t('blockCopy')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('encryptionMethod')}</Text>
        <View style={styles.algoList}>
          {ENCRYPTION_OPTIONS.map((opt) => {
            const active = algorithm === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.algoOption,
                  {
                    borderColor: active ? colors.tint : colors.border,
                    backgroundColor: active ? colors.tint + '14' : colors.inputBackground,
                  },
                ]}
                onPress={() => setAlgorithm(opt.value)}
              >
                <Text style={[styles.algoLabel, { color: active ? colors.tint : colors.text }]}>
                  {t(ALGO_LABEL_KEY[opt.value])}
                </Text>
                <Text style={[styles.algoDesc, { color: colors.textSecondary }]}>
                  {t(ALGO_DESC_KEY[opt.value])}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('entry')}</Text>

        <TextInput
          placeholder={t('nameEmergency')}
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />

        <View style={styles.passwordRow}>
          <TextInput
            placeholder={t('passwordPlaintext')}
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showFormPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: colors.tint + '18' }, !password && { opacity: 0.4 }]}
            onPress={() => setShowFormPassword((v) => !v)}
            disabled={!password}
          >
            <Text style={[styles.smallBtnText, { color: colors.tint }]}>
              {showFormPassword ? t('hide') : t('show')}
            </Text>
          </TouchableOpacity>
        </View>

        {needsKey && (
          <View style={styles.passwordRow}>
            <TextInput
              placeholder={t('encryptionKey')}
              placeholderTextColor={colors.textSecondary}
              value={encryptionKey}
              onChangeText={setEncryptionKey}
              secureTextEntry={!showFormKey}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />
            <TouchableOpacity
              style={[
                styles.smallBtn,
                { backgroundColor: colors.tint + '18' },
                !encryptionKey && { opacity: 0.4 },
              ]}
              onPress={() => setShowFormKey((v) => !v)}
              disabled={!encryptionKey}
            >
              <Text style={[styles.smallBtnText, { color: colors.tint }]}>
                {showFormKey ? t('hide') : t('show')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(previewCipher || encrypting) && (
          <View style={[styles.previewBox, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
                {t('encryptedPreview')} {encrypting ? '(…)' : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowPreviewCipher((v) => !v)} disabled={!previewCipher}>
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 13 }}>
                  {showPreviewCipher ? t('hide') : t('show')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.previewCipher, { color: colors.text }]} selectable={allowCopy}>
              {showPreviewCipher
                ? previewCipher
                : previewCipher
                  ? mask(previewCipher, false)
                  : '—'}
            </Text>
          </View>
        )}

        <TextInput
          placeholder={t('noteOptional')}
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          style={[
            styles.input,
            styles.noteInput,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: colors.danger },
            encrypting && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={encrypting}
        >
          <Text style={styles.saveBtnText}>
            {encrypting ? t('encrypting') : isEditing ? t('updateEntry') : t('encryptAndSave')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.selectBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.selectBarText, { color: colors.danger }]}>
          {t('hardcodedCount', { count: entries.length })}
        </Text>
        <TouchableOpacity
          style={[
            styles.searchIconBtn,
            {
              backgroundColor: showSearch ? colors.tint + '22' : 'transparent',
              borderColor: showSearch ? colors.tint : colors.border,
            },
          ]}
          onPress={() => {
            if (showSearch) {
              setShowSearch(false);
              setSearchQuery('');
            } else setShowSearch(true);
          }}
        >
          <Text style={{ fontSize: 15 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchHardcoded')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderItem = ({ item }: { item: HardcodedPasswordEntry }) => {
    const isDecrypted = !!decryptedIds[item.id];
    const cipherOn = !!visibleCipher[item.id];
    const isConfirming = confirmingDeleteId === item.id;
    const isBeingEdited = editingId === item.id;
    const plainCopied = copiedId === item.id + '-plain';
    const cipherCopied = copiedId === item.id + '-cipher';

    return (
      <View
        style={[
          styles.entry,
          {
            backgroundColor: colors.card,
            borderWidth: 1.5,
            borderColor: isBeingEdited ? colors.danger : colors.danger + '44',
          },
        ]}
      >
        <View style={styles.entryHeader}>
          <Text style={[styles.entryName, { color: colors.text, flex: 1 }]}>{item.name}</Text>
          <TouchableOpacity onPress={() => toggleFavorite(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 20, color: item.favorite ? '#f5a623' : colors.textSecondary }}>
              {item.favorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: colors.tint + '22' }]}>
            <Text style={[styles.badgeText, { color: colors.tint }]}>
              {t(ALGO_LABEL_KEY[item.algorithm])}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.allowCopy ? colors.successBackground : colors.dangerBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: item.allowCopy ? colors.success : colors.danger },
              ]}
            >
              {item.allowCopy ? t('copyOk') : t('noCopy')}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('decryptedPassword')}</Text>
        {!isDecrypted ? (
          <TouchableOpacity
            style={[styles.decryptBtn, { backgroundColor: colors.tint }]}
            onPress={() => setDecryptedIds((p) => ({ ...p, [item.id]: true }))}
          >
            <Text style={styles.decryptBtnText}>{t('decrypt')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={[styles.value, { color: colors.text }]}>{item.password}</Text>
            <View style={styles.inlineActions}>
              <TouchableOpacity
                onPress={() =>
                  setDecryptedIds((p) => {
                    const next = { ...p };
                    delete next[item.id];
                    return next;
                  })
                }
              >
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 13 }}>{t('hide')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => copyText(item.password, item.id + '-plain', item.allowCopy)}
              >
                <Text
                  style={{
                    color: item.allowCopy
                      ? plainCopied
                        ? colors.success
                        : colors.text
                      : colors.textSecondary,
                    fontWeight: '600',
                    fontSize: 13,
                    opacity: item.allowCopy ? 1 : 0.45,
                  }}
                >
                  {plainCopied ? t('copied') : t('copy')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('encryptedValue')}</Text>
        <Text style={[styles.cipherValue, { color: colors.text }]} selectable={item.allowCopy}>
          {mask(item.ciphertext, cipherOn)}
        </Text>
        <View style={styles.inlineActions}>
          <TouchableOpacity onPress={() => setVisibleCipher((p) => ({ ...p, [item.id]: !cipherOn }))}>
            <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 13 }}>
              {cipherOn ? t('hide') : t('show')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => copyText(item.ciphertext, item.id + '-cipher', item.allowCopy)}
          >
            <Text
              style={{
                color: item.allowCopy
                  ? cipherCopied
                    ? colors.success
                    : colors.text
                  : colors.textSecondary,
                fontWeight: '600',
                fontSize: 13,
                opacity: item.allowCopy ? 1 : 0.45,
              }}
            >
              {cipherCopied ? t('copied') : t('copy')}
            </Text>
          </TouchableOpacity>
        </View>

        {item.notes ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('note')}</Text>
            <Text style={[styles.value, { color: colors.text }]}>{item.notes}</Text>
          </>
        ) : null}

        <View style={styles.actions}>
          {!isConfirming ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.overlay }]}
                onPress={() => startEdit(item)}
              >
                <Text style={[styles.actionText, { color: colors.tint }]}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.dangerBackground }]}
                onPress={() => setConfirmingDeleteId(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>{t('delete')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.overlay }]}
                onPress={() => setConfirmingDeleteId(null)}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.dangerBackground }]}
                onPress={() => confirmDelete(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>{t('remove')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const emptyMessage = searchQuery.trim()
    ? t('noResultsFor', { query: searchQuery.trim() })
    : t('noHardcodedYet');

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectBarText: { fontSize: 14, fontWeight: '700' },
  searchIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  form: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editingText: { fontSize: 14, fontWeight: '600' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  algoList: { gap: 8, marginBottom: 14 },
  algoOption: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  algoLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  algoDesc: { fontSize: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  passwordInput: { flex: 1, marginBottom: 0 },
  smallBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallBtnText: { fontWeight: '600', fontSize: 13 },
  noteInput: { minHeight: 56, textAlignVertical: 'top' },
  previewBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTitle: { fontSize: 12, fontWeight: '700' },
  previewCipher: { fontSize: 12, lineHeight: 18 },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  entry: { padding: 16, borderRadius: 12, marginBottom: 12 },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  entryName: { fontSize: 17, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  label: { fontSize: 12, marginTop: 8, marginBottom: 2 },
  value: { fontSize: 15 },
  cipherValue: { fontSize: 12, lineHeight: 18 },
  decryptBtn: {
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  decryptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inlineActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  actions: { flexDirection: 'row', marginTop: 14, gap: 10, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 32,
    lineHeight: 22,
    marginBottom: 24,
  },
});

export default HardcodedPasswordPanel;
