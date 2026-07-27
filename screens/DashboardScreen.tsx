import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
  BackHandler,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  addPassword,
  updatePassword,
  loadVault,
  deletePassword,
  PasswordEntry,
} from '../utils/vault';
import { exportAsJSON, exportAsCSV, pickAndParseImportFile, commitImport } from '../utils/importExport';
import { loadCategories, addCategory, deleteCategory } from '../utils/categories';
import { useTheme, ThemeMode } from '../context/ThemeContext';

type StrengthLevel = {
  score: number;
  label: string;
  color: string;
  feedback: string;
};

const calculateStrength = (password: string): StrengthLevel => {
  if (!password) return { score: 0, label: '', color: '#e0e0e0', feedback: '' };

  let score = 0;
  const feedbacks: string[] = [];

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (varietyCount >= 3) score += 1;
  if (varietyCount === 4) score += 1;

  if (password.length < 8) feedbacks.push('Too short');
  if (!hasLower || !hasUpper) feedbacks.push('Mix upper & lower case');
  if (!hasNumber) feedbacks.push('Add numbers');
  if (!hasSymbol) feedbacks.push('Add symbols');

  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin'];
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
    feedbacks.push('Avoid common words');
  }

  if (/(.)\1{2,}/.test(password) || /012|123|234|345|456|567|678|789|abc|bcd|cde/.test(password.toLowerCase())) {
    score = Math.max(0, score - 1);
    feedbacks.push('Avoid sequences');
  }

  score = Math.min(4, Math.max(0, score));

  const levels: Record<number, { label: string; color: string }> = {
    0: { label: 'Very Weak', color: '#d32f2f' },
    1: { label: 'Weak', color: '#f57c00' },
    2: { label: 'Fair', color: '#fbc02d' },
    3: { label: 'Strong', color: '#388e3c' },
    4: { label: 'Very Strong', color: '#1b5e20' },
  };

  return {
    score,
    label: levels[score].label,
    color: levels[score].color,
    feedback: feedbacks.length > 0 ? feedbacks[0] : 'Looks good!',
  };
};

const DashboardScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();

  const [vault, setVault] = useState<PasswordEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<string | null>(null);

  // name stored in `site` field for backward compatibility
  const [site, setSite] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [importEntries, setImportEntries] = useState<PasswordEntry[] | null>(null);
  const [showImportCategoryModal, setShowImportCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const isEditing = editingId !== null;

  const filteredVault = useMemo(() => {
    if (!selectedCategory) return vault;
    return vault.filter((e) => e.category === selectedCategory);
  }, [vault, selectedCategory]);

  useEffect(() => {
    const loadData = async () => {
      const [data, cats] = await Promise.all([loadVault(), loadCategories()]);
      setVault(data);
      setCategories(cats);
      setLoading(false);
    };
    loadData();
  }, []);

  const clearForm = useCallback(() => {
    setSite('');
    setUrl('');
    setUsername('');
    setPassword('');
    setNotes('');
    setShowFormPassword(false);
    setEditingId(null);
    setFormCategory(selectedCategory);
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showImportCategoryModal) {
          setShowImportCategoryModal(false);
          setImportEntries(null);
          return true;
        }
        if (showThemePicker) {
          setShowThemePicker(false);
          return true;
        }
        if (showExportMenu) {
          setShowExportMenu(false);
          return true;
        }
        if (confirmingDeleteId) {
          setConfirmingDeleteId(null);
          return true;
        }
        if (editingId) {
          clearForm();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [showImportCategoryModal, showThemePicker, showExportMenu, confirmingDeleteId, editingId, clearForm])
  );

  const generatePassword = (length = 16) => {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const startEdit = (entry: PasswordEntry) => {
    setEditingId(entry.id);
    setSite(entry.site);
    setUrl(entry.url || '');
    setUsername(entry.username);
    setPassword(entry.password);
    setNotes(entry.notes || '');
    setFormCategory(entry.category || null);
    setShowFormPassword(false);
    setConfirmingDeleteId(null);
  };

  const handleSave = async () => {
    if (!site || !username || !password) {
      Alert.alert('Error', 'Please fill Name, Username and Password');
      return;
    }

    try {
      const payload = {
        site,
        url: url.trim() || undefined,
        username,
        password,
        notes: notes.trim() || undefined,
        category: formCategory || undefined,
      };

      if (isEditing && editingId) {
        await updatePassword(editingId, payload);
      } else {
        await addPassword(payload);
      }
      setVault(await loadVault());
      clearForm();
    } catch (error) {
      Alert.alert('Error', isEditing ? 'Failed to update password' : 'Failed to save password');
    }
  };

  const confirmDelete = async (id: string) => {
    await deletePassword(id);
    setVault(await loadVault());
    setConfirmingDeleteId(null);
    if (editingId === id) clearForm();
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string = 'form') => {
    if (!text) return;
    Clipboard.setString(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportJSON = async () => {
    setShowExportMenu(false);
    try {
      await exportAsJSON();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not export vault');
    }
  };

  const handleExportCSV = async () => {
    setShowExportMenu(false);
    try {
      await exportAsCSV();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not export vault');
    }
  };

  const handleImport = async () => {
    try {
      const entries = await pickAndParseImportFile();
      if (!entries) return;

      setImportEntries(entries);
      setShowImportCategoryModal(true);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Could not import file');
    }
  };

  const finishImport = async (category: string | null) => {
    if (!importEntries) return;

    try {
      let cat = category;
      if (showNewCategoryInput && newCategoryName.trim()) {
        const updated = await addCategory(newCategoryName.trim());
        setCategories(updated);
        cat = newCategoryName.trim();
      }

      const result = await commitImport(importEntries, cat);
      setVault(await loadVault());
      setShowImportCategoryModal(false);
      setImportEntries(null);

      Alert.alert(
        'Import complete',
        `Imported: ${result.imported}\nSkipped (duplicates): ${result.skipped}\nTotal in file: ${result.total}` +
          (cat ? `\nCategory: ${cat}` : '\nCategory: Main list')
      );
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Could not save imported passwords');
    }
  };

  const handleDeleteCategory = (name: string) => {
    Alert.alert(
      'Delete category',
      `Delete "${name}"? Passwords in it will move to the main list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const data = await loadVault();
            const updated = data.map((e) =>
              e.category === name ? { ...e, category: undefined } : e
            );
            const { saveVault } = await import('../utils/vault');
            await saveVault(updated);
            const cats = await deleteCategory(name);
            setCategories(cats);
            setVault(updated);
            if (selectedCategory === name) setSelectedCategory(null);
            if (formCategory === name) setFormCategory(null);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    router.replace('/login');
  };

  const themeOptions: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: 'Light', icon: '☀️' },
    { key: 'dark', label: 'Dark', icon: '🌙' },
    { key: 'system', label: 'System', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        <Text style={{ color: colors.text }}>Loading your vault...</Text>
      </View>
    );
  }

  const isFormCopied = copiedId === 'form';

  const listHeader = (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🔐 Kryptix Vault</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowThemePicker(!showThemePicker)}
          >
            <Text style={{ fontSize: 16 }}>
              {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '⚙️'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
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

      <View style={styles.ioBar}>
        <TouchableOpacity
          style={[styles.ioBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleImport}
        >
          <Text style={[styles.ioBtnText, { color: colors.text }]}>Import</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ioBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowExportMenu(!showExportMenu)}
        >
          <Text style={[styles.ioBtnText, { color: colors.text }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {showExportMenu && (
        <View style={[styles.exportMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.exportOption} onPress={handleExportJSON}>
            <Text style={[styles.exportOptionText, { color: colors.text }]}>Export as JSON</Text>
            <Text style={[styles.exportOptionHint, { color: colors.textSecondary }]}>Full backup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportOption} onPress={handleExportCSV}>
            <Text style={[styles.exportOptionText, { color: colors.text }]}>Export as CSV</Text>
            <Text style={[styles.exportOptionHint, { color: colors.textSecondary }]}>
              Chrome / Firefox / Brave compatible
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={{ gap: 8 }}
        nestedScrollEnabled
      >
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: selectedCategory === null ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, { color: selectedCategory === null ? '#fff' : colors.text }]}>All</Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.chip,
              {
                backgroundColor: selectedCategory === cat ? colors.tint : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(cat)}
            onLongPress={() => handleDeleteCategory(cat)}
          >
            <Text style={[styles.chipText, { color: selectedCategory === cat ? '#fff' : colors.text }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.form, { backgroundColor: colors.card }]}>
        {isEditing && (
          <View style={styles.editingBanner}>
            <Text style={[styles.editingText, { color: colors.tint }]}>Editing entry</Text>
            <TouchableOpacity onPress={clearForm}>
              <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          placeholder="Name"
          placeholderTextColor={colors.textSecondary}
          value={site}
          onChangeText={setSite}
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />
        <TextInput
          placeholder="URL"
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />
        <TextInput
          placeholder="Username"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          autoCapitalize="none"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ gap: 8 }}
          nestedScrollEnabled
        >
          <TouchableOpacity
            style={[
              styles.chip,
              {
                backgroundColor: formCategory === null ? colors.tint + '33' : colors.inputBackground,
                borderColor: formCategory === null ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setFormCategory(null)}
          >
            <Text style={[styles.chipText, { color: colors.text, fontSize: 13 }]}>No category</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                {
                  backgroundColor: formCategory === cat ? colors.tint + '33' : colors.inputBackground,
                  borderColor: formCategory === cat ? colors.tint : colors.border,
                },
              ]}
              onPress={() => setFormCategory(cat)}
            >
              <Text style={[styles.chipText, { color: colors.text, fontSize: 13 }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.passwordInputRow}>
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showFormPassword}
            style={[
              styles.input,
              styles.passwordInput,
              { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
            ]}
          />
          <TouchableOpacity
            style={[styles.copyInputBtn, { backgroundColor: colors.tint + '18' }, !password && { opacity: 0.4 }]}
            onPress={() => setShowFormPassword((p) => !p)}
            disabled={!password}
          >
            <Text style={[styles.copyInputBtnText, { color: colors.tint }]}>
              {showFormPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.copyInputBtn,
              { backgroundColor: isFormCopied ? colors.successBackground : colors.tint + '18' },
              !password && { opacity: 0.4 },
            ]}
            onPress={() => copyToClipboard(password, 'form')}
            disabled={!password}
          >
            <Text style={[styles.copyInputBtnText, { color: isFormCopied ? colors.success : colors.tint }]}>
              {isFormCopied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: i <= strength.score ? strength.color : colors.border },
                  ]}
                />
              ))}
            </View>
            <View style={styles.strengthTextRow}>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              <Text style={[styles.strengthFeedback, { color: colors.textSecondary }]}>{strength.feedback}</Text>
            </View>
          </View>
        )}

        <TextInput
          placeholder="Note (optional)"
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          style={[
            styles.input,
            styles.noteInput,
            { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
          ]}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.buttonSecondary }]}
            onPress={() => generatePassword()}
          >
            <Text style={styles.generateBtnText}>Generate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={handleSave}>
            <Text style={styles.addBtnText}>{isEditing ? 'Update' : 'Add Password'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <FlatList
        style={styles.list}
        data={filteredVault}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => {
          const isVisible = visiblePasswords[item.id];
          const isCopied = copiedId === item.id;
          const isConfirmingDelete = confirmingDeleteId === item.id;
          const isBeingEdited = editingId === item.id;

          return (
            <View
              style={[
                styles.entry,
                {
                  backgroundColor: colors.card,
                  borderWidth: isBeingEdited ? 1.5 : 0,
                  borderColor: isBeingEdited ? colors.tint : 'transparent',
                },
              ]}
            >
              <View style={styles.entryHeader}>
                <Text style={[styles.site, { color: colors.text, flex: 1 }]}>{item.site}</Text>
                {item.category ? (
                  <View style={[styles.catBadge, { backgroundColor: colors.tint + '22' }]}>
                    <Text style={[styles.catBadgeText, { color: colors.tint }]}>{item.category}</Text>
                  </View>
                ) : null}
              </View>

              {item.url ? (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>URL</Text>
                  <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                    {item.url}
                  </Text>
                </>
              ) : null}

              <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
              <Text style={[styles.value, { color: colors.text }]}>{item.username}</Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {isVisible ? item.password : '••••••••••••'}
              </Text>

              {item.notes ? (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Note</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{item.notes}</Text>
                </>
              ) : null}

              <View style={styles.actions}>
                {!isConfirmingDelete ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.overlay }]}
                      onPress={() => togglePasswordVisibility(item.id)}
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
                      onPress={() => copyToClipboard(item.password, item.id)}
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
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {selectedCategory
              ? `No passwords in "${selectedCategory}" yet.`
              : 'No passwords saved yet.\nAdd your first one above!'}
          </Text>
        }
      />

      <Modal visible={showImportCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import passwords</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {importEntries?.length || 0} passwords found. Where should they go?
            </Text>

            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => finishImport(null)}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Main list (no category)</Text>
            </TouchableOpacity>

            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalOption, { borderColor: colors.border }]}
                onPress={() => finishImport(cat)}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{cat}</Text>
              </TouchableOpacity>
            ))}

            {!showNewCategoryInput ? (
              <TouchableOpacity
                style={[styles.modalOption, { borderColor: colors.tint, borderStyle: 'dashed' }]}
                onPress={() => setShowNewCategoryInput(true)}
              >
                <Text style={[styles.modalOptionText, { color: colors.tint }]}>+ Create new category</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  placeholder="Category name (e.g. Brave)"
                  placeholderTextColor={colors.textSecondary}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  style={[
                    styles.input,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
                  ]}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.tint, marginTop: 4 }]}
                  onPress={() => finishImport(newCategoryName.trim() || null)}
                >
                  <Text style={styles.addBtnText}>Import into new category</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => {
                setShowImportCategoryModal(false);
                setImportEntries(null);
              }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  list: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
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
  ioBar: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  ioBtnText: { fontWeight: '600', fontSize: 14 },
  exportMenu: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  exportOption: { paddingVertical: 14, paddingHorizontal: 16 },
  exportOptionText: { fontSize: 15, fontWeight: '600' },
  exportOptionHint: { fontSize: 12, marginTop: 2 },
  chipsRow: { marginBottom: 12, maxHeight: 40 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  form: { padding: 16, borderRadius: 12, marginBottom: 20 },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editingText: { fontSize: 14, fontWeight: '600' },
  cancelEditText: { fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  noteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  passwordInput: { flex: 1, marginBottom: 0 },
  copyInputBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  copyInputBtnText: { fontWeight: '600', fontSize: 14 },
  strengthContainer: { marginBottom: 14 },
  strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  strengthTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: { fontSize: 13, fontWeight: '700' },
  strengthFeedback: { fontSize: 12 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  generateBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  addBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  entry: { padding: 16, borderRadius: 12, marginBottom: 12 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  site: { fontSize: 18, fontWeight: 'bold' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  label: { fontSize: 12, marginTop: 6, marginBottom: 2 },
  value: { fontSize: 15 },
  actions: { flexDirection: 'row', marginTop: 14, gap: 10, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', fontStyle: 'italic', marginTop: 40, lineHeight: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  modalOption: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  modalOptionText: { fontSize: 15, fontWeight: '600' },
});

export default DashboardScreen;
