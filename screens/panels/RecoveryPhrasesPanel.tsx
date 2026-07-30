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
import type { RecoveryPhraseEntry } from '../../types/recovery';
import {
  addRecoveryPhrase,
  countWords,
  deleteRecoveryPhrase,
  loadRecoveryVault,
  updateRecoveryPhrase,
} from '../../utils/recovery';

const RecoveryPhrasesPanel = () => {
  const { colors } = useTheme();

  const [entries, setEntries] = useState<RecoveryPhraseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [notes, setNotes] = useState('');
  const [showFormPhrase, setShowFormPhrase] = useState(false);
  const [phraseFocused, setPhraseFocused] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const isEditing = editingId !== null;
  const wordCount = useMemo(() => countWords(phrase), [phrase]);
  const isFormCopied = copiedId === 'form';

  // multiline + secureTextEntry is unsupported on iOS/Android — reveal via state instead
  const showPlainPhrase = showFormPhrase || phraseFocused || phrase.length === 0;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q) ||
        e.phrase.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds[e.id]);

  const refresh = useCallback(async () => {
    setEntries(await loadRecoveryVault());
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const clearForm = () => {
    setName('');
    setPhrase('');
    setNotes('');
    setShowFormPhrase(false);
    setPhraseFocused(false);
    setEditingId(null);
  };

  const startEdit = (entry: RecoveryPhraseEntry) => {
    setEditingId(entry.id);
    setName(entry.name);
    setPhrase(entry.phrase);
    setNotes(entry.notes || '');
    setShowFormPhrase(false);
    setPhraseFocused(false);
    setConfirmingDeleteId(null);
  };

  const handleSave = async () => {
    if (!name.trim() || !phrase.trim()) {
      Alert.alert('Error', 'Please enter a name and the recovery phrase');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        phrase: phrase.trim(),
        notes: notes.trim() || undefined,
      };

      if (isEditing && editingId) {
        await updateRecoveryPhrase(editingId, payload);
      } else {
        await addRecoveryPhrase(payload);
      }
      await refresh();
      clearForm();
    } catch {
      Alert.alert('Error', isEditing ? 'Failed to update phrase' : 'Failed to save phrase');
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteRecoveryPhrase(id);
      await refresh();
      setConfirmingDeleteId(null);
      if (editingId === id) clearForm();
      setSelectedIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      Alert.alert('Error', 'Could not delete phrase');
    }
  };

  const toggleFavorite = async (entry: RecoveryPhraseEntry) => {
    try {
      await updateRecoveryPhrase(entry.id, { favorite: !entry.favorite });
      await refresh();
    } catch {
      Alert.alert('Error', 'Could not update favorite');
    }
  };

  const toggleVisible = (id: string) => {
    setVisibleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAllFiltered = () => {
    if (filtered.length === 0) return;
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = { ...prev };
        filtered.forEach((e) => {
          delete next[e.id];
        });
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = { ...prev };
        filtered.forEach((e) => {
          next[e.id] = true;
        });
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds({});

  const handleBulkDelete = () => {
    if (selectedCount === 0) return;
    Alert.alert(
      'Delete selected',
      `Delete ${selectedCount} phrase${selectedCount === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
            for (const id of ids) {
              await deleteRecoveryPhrase(id);
            }
            await refresh();
            setSelectedIds({});
            if (editingId && ids.includes(editingId)) clearForm();
          },
        },
      ]
    );
  };

  const copyText = (text: string, id: string = 'form') => {
    if (!text) return;
    Clipboard.setString(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const maskPhrase = (p: string) => {
    const words = p.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 2) return '••••••••';
    return words.map(() => '••••').join(' ');
  };

  const toggleSearch = () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery('');
    } else setShowSearch(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary }}>Loading recovery phrases…</Text>
      </View>
    );
  }

  const phraseFieldStyle = [
    styles.input,
    styles.phraseInput,
    {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  const listHeader = (
    <>
      <View style={[styles.selectBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={toggleSelectAllFiltered}
          style={[styles.selectBarLeft, filtered.length === 0 && { opacity: 0.4 }]}
          disabled={filtered.length === 0}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.tint,
                backgroundColor: allFilteredSelected ? colors.tint : 'transparent',
              },
            ]}
          >
            {allFilteredSelected ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={[styles.selectBarText, { color: colors.text }]}>
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
          </Text>
        </TouchableOpacity>

        <View style={styles.selectBarRight}>
          {selectedCount > 0 && (
            <>
              <TouchableOpacity onPress={clearSelection}>
                <Text style={[styles.selectBarAction, { color: colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete}>
                <Text style={[styles.selectBarAction, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[
              styles.searchIconBtn,
              {
                backgroundColor: showSearch ? colors.tint + '22' : 'transparent',
                borderColor: showSearch ? colors.tint : colors.border,
              },
            ]}
            onPress={toggleSearch}
          >
            <Text style={{ fontSize: 15 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search name, notes, phrase…"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={toggleSearch}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.form, { backgroundColor: colors.card }]}>
        {isEditing && (
          <View style={styles.editingBanner}>
            <Text style={[styles.editingText, { color: colors.tint }]}>Editing phrase</Text>
            <TouchableOpacity onPress={clearForm}>
              <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          placeholder="Name (e.g. MetaMask, Ledger)"
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

        {showPlainPhrase ? (
          <TextInput
            placeholder="Recovery phrase (12 or 24 words)"
            placeholderTextColor={colors.textSecondary}
            value={phrase}
            onChangeText={setPhrase}
            onFocus={() => setPhraseFocused(true)}
            onBlur={() => setPhraseFocused(false)}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={phraseFieldStyle}
          />
        ) : (
          <TouchableOpacity
            style={phraseFieldStyle}
            onPress={() => setShowFormPhrase(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.maskedPhrase, { color: colors.text }]}>
              {maskPhrase(phrase)}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.phraseMetaRow}>
          <Text style={[styles.wordCount, { color: colors.textSecondary }]}>
            {phrase.trim() ? `${wordCount} word${wordCount === 1 ? '' : 's'}` : ' '}
          </Text>
          <View style={styles.phraseActions}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.tint + '18' }, !phrase && { opacity: 0.4 }]}
              onPress={() => setShowFormPhrase((v) => !v)}
              disabled={!phrase}
            >
              <Text style={[styles.smallBtnText, { color: colors.tint }]}>
                {showFormPhrase || phraseFocused ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.smallBtn,
                {
                  backgroundColor: isFormCopied ? colors.successBackground : colors.tint + '18',
                },
                !phrase && { opacity: 0.4 },
              ]}
              onPress={() => copyText(phrase, 'form')}
              disabled={!phrase}
            >
              <Text
                style={[
                  styles.smallBtnText,
                  { color: isFormCopied ? colors.success : colors.tint },
                ]}
              >
                {isFormCopied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          placeholder="Note (optional)"
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

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.tint }]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{isEditing ? 'Update phrase' : 'Add phrase'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderItem = ({ item }: { item: RecoveryPhraseEntry }) => {
    const isVisible = !!visibleIds[item.id];
    const isCopied = copiedId === item.id;
    const isConfirming = confirmingDeleteId === item.id;
    const isBeingEdited = editingId === item.id;
    const isSelected = !!selectedIds[item.id];
    const words = countWords(item.phrase);

    return (
      <View
        style={[
          styles.entry,
          {
            backgroundColor: colors.card,
            borderWidth: isBeingEdited || isSelected ? 1.5 : 0,
            borderColor: isBeingEdited
              ? colors.tint
              : isSelected
                ? colors.tint + '99'
                : 'transparent',
          },
        ]}
      >
        <View style={styles.entryHeader}>
          <TouchableOpacity
            onPress={() => toggleSelect(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 8 }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: colors.tint,
                  backgroundColor: isSelected ? colors.tint : 'transparent',
                },
              ]}
            >
              {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
          </TouchableOpacity>
          <Text style={[styles.entryName, { color: colors.text, flex: 1 }]}>{item.name}</Text>
          <TouchableOpacity onPress={() => toggleFavorite(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 20, color: item.favorite ? '#f5a623' : colors.textSecondary }}>
              {item.favorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: colors.tint + '22' }]}>
            <Text style={[styles.badgeText, { color: colors.tint }]}>{words}w</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Phrase</Text>
        <Text style={[styles.phraseValue, { color: colors.text }]}>
          {isVisible ? item.phrase : maskPhrase(item.phrase)}
        </Text>

        {item.notes ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Note</Text>
            <Text style={[styles.value, { color: colors.text }]}>{item.notes}</Text>
          </>
        ) : null}

        <View style={styles.actions}>
          {!isConfirming ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.overlay }]}
                onPress={() => toggleVisible(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {isVisible ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: isCopied ? colors.successBackground : colors.overlay },
                ]}
                onPress={() => copyText(item.phrase, item.id)}
              >
                <Text style={[styles.actionText, { color: isCopied ? colors.success : colors.text }]}>
                  {isCopied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.overlay }]}
                onPress={() => startEdit(item)}
              >
                <Text style={[styles.actionText, { color: colors.tint }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.dangerBackground }]}
                onPress={() => setConfirmingDeleteId(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.overlay }]}
                onPress={() => setConfirmingDeleteId(null)}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.dangerBackground }]}
                onPress={() => confirmDelete(item.id)}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const emptyMessage = searchQuery.trim()
    ? `No results for "${searchQuery.trim()}".`
    : 'No recovery phrases yet.\nAdd your first seed phrase above.';

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
    gap: 8,
  },
  selectBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  selectBarText: { fontSize: 14, fontWeight: '600' },
  selectBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectBarAction: { fontSize: 14, fontWeight: '700' },
  searchIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
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
  form: { padding: 16, borderRadius: 12, marginBottom: 16 },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editingText: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  phraseInput: { minHeight: 88, textAlignVertical: 'top' },
  maskedPhrase: { fontSize: 16, lineHeight: 24 },
  noteInput: { minHeight: 56, textAlignVertical: 'top' },
  phraseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: -4,
  },
  wordCount: { fontSize: 13, fontWeight: '600' },
  phraseActions: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallBtnText: { fontWeight: '600', fontSize: 13 },
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
    marginBottom: 6,
  },
  entryName: { fontSize: 17, fontWeight: '700' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  label: { fontSize: 12, marginTop: 6, marginBottom: 2 },
  value: { fontSize: 15 },
  phraseValue: { fontSize: 14, lineHeight: 22 },
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

export default RecoveryPhrasesPanel;
