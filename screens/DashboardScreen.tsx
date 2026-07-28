import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Clipboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import {
  addCategory,
  deleteCategory,
  loadCategories,
  reorderCategories,
} from '../utils/categories';
import { commitImport, exportAsCSV, exportAsJSON, pickAndParseImportFile } from '../utils/importExport';
import { applyFilteredReorder } from '../utils/reorder';
import {
  addPassword,
  deletePassword,
  deletePasswords,
  loadVault,
  PasswordEntry,
  saveVault,
  updatePassword,
  updatePasswords,
} from '../utils/vault';

type StrengthLevel = {
  score: number;
  label: string;
  color: string;
  feedback: string;
};

type ExportFormat = 'json' | 'csv';
type ListFilter = string | null;

const FAVORITES_FILTER = '__favorites__';

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
  const [listFilter, setListFilter] = useState<ListFilter>(null);
  const [formCategory, setFormCategory] = useState<string | null>(null);

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
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);

  const [importEntries, setImportEntries] = useState<PasswordEntry[] | null>(null);
  const [showImportCategoryModal, setShowImportCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const isEditing = editingId !== null;

  const activeCategory =
    listFilter && listFilter !== FAVORITES_FILTER ? listFilter : null;

  // Preserve manual order — no auto-sort so drag-and-drop sticks
  const filteredVault = useMemo(() => {
    if (listFilter === FAVORITES_FILTER) return vault.filter((e) => e.favorite);
    if (listFilter) return vault.filter((e) => e.category === listFilter);
    return vault;
  }, [vault, listFilter]);

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  const selectedIdList = useMemo(
    () => Object.keys(selectedIds).filter((id) => selectedIds[id]),
    [selectedIds]
  );

  const selectedEntries = useMemo(
    () => vault.filter((e) => selectedIds[e.id]),
    [vault, selectedIds]
  );

  const allFilteredSelected =
    filteredVault.length > 0 && filteredVault.every((e) => selectedIds[e.id]);

  const selectedAllFavorited =
    selectedCount > 0 && selectedEntries.every((e) => e.favorite);

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
    setFormCategory(activeCategory);
  }, [activeCategory]);

  const closeExportMenu = useCallback(() => {
    setShowExportMenu(false);
    setExportFormat(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showBulkCategoryModal) {
          setShowBulkCategoryModal(false);
          return true;
        }
        if (showCreateCategoryModal) {
          setShowCreateCategoryModal(false);
          return true;
        }
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
          if (exportFormat) setExportFormat(null);
          else closeExportMenu();
          return true;
        }
        if (selectedCount > 0) {
          setSelectedIds({});
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
    }, [
      showBulkCategoryModal,
      showCreateCategoryModal,
      showImportCategoryModal,
      showThemePicker,
      showExportMenu,
      exportFormat,
      selectedCount,
      confirmingDeleteId,
      editingId,
      clearForm,
      closeExportMenu,
    ])
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
      const categoryForSave = isEditing ? formCategory : activeCategory;
      const payload = {
        site,
        url: url.trim() || undefined,
        username,
        password,
        notes: notes.trim() || undefined,
        category: categoryForSave || undefined,
      };

      if (isEditing && editingId) {
        await updatePassword(editingId, payload);
      } else {
        await addPassword(payload);
      }
      setVault(await loadVault());
      clearForm();
    } catch {
      Alert.alert('Error', isEditing ? 'Failed to update password' : 'Failed to save password');
    }
  };

  const confirmDelete = async (id: string) => {
    await deletePassword(id);
    setVault(await loadVault());
    setConfirmingDeleteId(null);
    setSelectedIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingId === id) clearForm();
  };

  const toggleFavorite = async (entry: PasswordEntry) => {
    try {
      await updatePassword(entry.id, { favorite: !entry.favorite });
      setVault(await loadVault());
    } catch {
      Alert.alert('Error', 'Could not update favorite');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = { ...prev };
        filteredVault.forEach((e) => {
          delete next[e.id];
        });
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = { ...prev };
        filteredVault.forEach((e) => {
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
      `Delete ${selectedCount} password${selectedCount === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePasswords(selectedIdList);
            setVault(await loadVault());
            setSelectedIds({});
            if (editingId && selectedIdList.includes(editingId)) clearForm();
          },
        },
      ]
    );
  };

  const handleBulkFavorite = async () => {
    if (selectedCount === 0) return;
    try {
      await updatePasswords(selectedIdList, { favorite: !selectedAllFavorited });
      setVault(await loadVault());
    } catch {
      Alert.alert('Error', 'Could not update favorites');
    }
  };

  const applyBulkCategory = async (category: string | null) => {
    if (selectedCount === 0) return;
    try {
      const data = await loadVault();
      const idSet = new Set(selectedIdList);
      const now = Date.now();
      await saveVault(
        data.map((e) =>
          idSet.has(e.id)
            ? { ...e, category: category || undefined, updatedAt: now }
            : e
        )
      );
      setVault(await loadVault());
      setShowBulkCategoryModal(false);
      setSelectedIds({});
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not move passwords');
    }
  };

  const onPasswordDragEnd = async ({ data }: { data: PasswordEntry[] }) => {
    try {
      const next =
        listFilter === null ? data : applyFilteredReorder(vault, data);
      await saveVault(next);
      setVault(next);
    } catch {
      Alert.alert('Error', 'Could not save new order');
    }
  };

  const onCategoryDragEnd = async ({ data }: { data: string[] }) => {
    try {
      setCategories(data);
      await reorderCategories(data);
    } catch {
      Alert.alert('Error', 'Could not save category order');
    }
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

  const openCreateCategory = () => {
    setNewCategoryName('');
    setShowCreateCategoryModal(true);
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    try {
      const updated = await addCategory(name);
      setCategories(updated);
      setListFilter(name);
      setFormCategory(name);
      setShowCreateCategoryModal(false);
      setNewCategoryName('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not create category');
    }
  };

  const toggleExportMenu = () => {
    if (showExportMenu) closeExportMenu();
    else {
      setExportFormat(null);
      setShowExportMenu(true);
    }
  };

  const runExport = async (format: ExportFormat, scope: 'all' | 'category' | 'selected') => {
    closeExportMenu();
    try {
      let entries: PasswordEntry[] | undefined;
      if (scope === 'all') entries = undefined;
      else if (scope === 'category') {
        entries = filteredVault;
        if (entries.length === 0) {
          Alert.alert('Nothing to export', 'No passwords in the current filter.');
          return;
        }
      } else {
        entries = selectedEntries;
        if (entries.length === 0) {
          Alert.alert('Nothing to export', 'Select passwords with the checkboxes first.');
          return;
        }
      }
      if (format === 'json') await exportAsJSON(entries);
      else await exportAsCSV(entries);
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
            try {
              const data = await loadVault();
              const updated = data.map((e) =>
                e.category === name ? { ...e, category: undefined } : e
              );
              await saveVault(updated);
              const cats = await deleteCategory(name);
              setCategories(cats);
              setVault(updated);
              if (listFilter === name) setListFilter(null);
              if (formCategory === name) setFormCategory(null);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not delete category');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => router.replace('/login');

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
  const formatLabel = exportFormat === 'json' ? 'JSON' : exportFormat === 'csv' ? 'CSV' : '';
  const filterLabel =
    listFilter === FAVORITES_FILTER ? 'Favorites' : listFilter || 'All';

  const renderPasswordItem = ({ item, drag, isActive }: RenderItemParams<PasswordEntry>) => {
    const isVisible = visiblePasswords[item.id];
    const isCopied = copiedId === item.id;
    const isConfirmingDelete = confirmingDeleteId === item.id;
    const isBeingEdited = editingId === item.id;
    const isSelected = !!selectedIds[item.id];
    const isFav = !!item.favorite;

    return (
      <ScaleDecorator>
        <View
          style={[
            styles.entry,
            {
              backgroundColor: colors.card,
              borderWidth: isBeingEdited || isSelected || isActive ? 1.5 : 0,
              borderColor: isActive
                ? colors.tint
                : isBeingEdited
                  ? colors.tint
                  : isSelected
                    ? colors.tint + '99'
                    : 'transparent',
              opacity: isActive ? 0.95 : 1,
            },
          ]}
        >
          <View style={styles.entryHeader}>
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={180}
              style={styles.dragHandle}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={[styles.dragHandleText, { color: colors.textSecondary }]}>⠿</Text>
            </TouchableOpacity>

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

            <Text style={[styles.site, { color: colors.text, flex: 1 }]}>{item.site}</Text>

            <TouchableOpacity
              onPress={() => toggleFavorite(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.starBtn}
            >
              <Text style={[styles.starIcon, { color: isFav ? '#f5a623' : colors.textSecondary }]}>
                {isFav ? '★' : '☆'}
              </Text>
            </TouchableOpacity>

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
      </ScaleDecorator>
    );
  };

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
          onPress={toggleExportMenu}
        >
          <Text style={[styles.ioBtnText, { color: colors.text }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {showExportMenu && (
        <View style={[styles.exportMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!exportFormat ? (
            <>
              <Text style={[styles.exportSectionTitle, { color: colors.textSecondary }]}>
                Choose format
              </Text>
              <TouchableOpacity style={styles.exportOption} onPress={() => setExportFormat('json')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportOption} onPress={() => setExportFormat('csv')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>CSV</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.exportStepHeader}>
                <TouchableOpacity onPress={() => setExportFormat(null)}>
                  <Text style={[styles.exportBack, { color: colors.tint }]}>← Format</Text>
                </TouchableOpacity>
                <Text style={[styles.exportSectionTitleInline, { color: colors.textSecondary }]}>
                  Export as {formatLabel}
                </Text>
              </View>
              <TouchableOpacity style={styles.exportOption} onPress={() => runExport(exportFormat, 'all')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>
                  All ({vault.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => runExport(exportFormat, 'category')}
              >
                <Text style={[styles.exportOptionText, { color: colors.text }]}>
                  {filterLabel} ({filteredVault.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportOption, selectedCount === 0 && { opacity: 0.45 }]}
                onPress={() => runExport(exportFormat, 'selected')}
                disabled={selectedCount === 0}
              >
                <Text style={[styles.exportOptionText, { color: colors.text }]}>
                  Selected ({selectedCount})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <Text style={[styles.reorderHint, { color: colors.textSecondary }]}>
        Long-press ⠿ or a category chip to reorder
      </Text>

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: listFilter === null ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setListFilter(null)}
        >
          <Text style={[styles.chipText, { color: listFilter === null ? '#fff' : colors.text }]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: listFilter === FAVORITES_FILTER ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setListFilter(FAVORITES_FILTER)}
        >
          <Text
            style={[
              styles.chipText,
              { color: listFilter === FAVORITES_FILTER ? '#fff' : colors.text },
            ]}
          >
            ★ Favorites
          </Text>
        </TouchableOpacity>

        <NestableDraggableFlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          onDragEnd={onCategoryDragEnd}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          activationDistance={8}
          renderItem={({ item: cat, drag, isActive }: RenderItemParams<string>) => {
            const isSelected = listFilter === cat;
            return (
              <ScaleDecorator>
                <View style={styles.categoryChipRow}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.tint : colors.card,
                        borderColor: isActive ? colors.tint : colors.border,
                        borderWidth: isActive ? 2 : 1,
                        opacity: isActive ? 0.9 : 1,
                      },
                    ]}
                    onPress={() => setListFilter(cat)}
                    onLongPress={drag}
                    delayLongPress={200}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? '#fff' : colors.text }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                  {isSelected && (
                    <TouchableOpacity
                      style={[styles.categoryDeleteButton, { backgroundColor: colors.dangerBackground }]}
                      onPress={() => handleDeleteCategory(cat)}
                    >
                      <Text style={[styles.categoryDeleteText, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScaleDecorator>
            );
          }}
        />

        <TouchableOpacity
          style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.tint, borderStyle: 'dashed' }]}
          onPress={openCreateCategory}
        >
          <Text style={[styles.chipText, { color: colors.tint }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

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
          autoCapitalize="none"
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />

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

      {/* Select bar sits at bottom of main menu / top of saved passwords */}
      {filteredVault.length > 0 && (
        <View style={[styles.selectBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={toggleSelectAllFiltered} style={styles.selectBarLeft}>
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

          {selectedCount > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectBarActions}>
              <TouchableOpacity onPress={clearSelection}>
                <Text style={[styles.selectBarAction, { color: colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowBulkCategoryModal(true)}>
                <Text style={[styles.selectBarAction, { color: colors.tint }]}>Move</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkFavorite}>
                <Text style={[styles.selectBarAction, { color: colors.tint }]}>
                  {selectedAllFavorited ? 'Unstar' : 'Star'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete}>
                <Text style={[styles.selectBarAction, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      )}
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
      <NestableScrollContainer
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {listHeader}

        {filteredVault.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {listFilter === FAVORITES_FILTER
              ? 'No favorites yet.\nTap ★ on a password to star it.'
              : listFilter
                ? `No passwords in "${listFilter}" yet.`
                : 'No passwords saved yet.\nAdd your first one above!'}
          </Text>
        ) : (
          <NestableDraggableFlatList
            data={filteredVault}
            keyExtractor={(item) => item.id}
            onDragEnd={onPasswordDragEnd}
            activationDistance={10}
            scrollEnabled={false}
            renderItem={renderPasswordItem}
          />
        )}
      </NestableScrollContainer>

      <Modal visible={showBulkCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Move selected</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Move {selectedCount} password{selectedCount === 1 ? '' : 's'} to…
            </Text>
            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => applyBulkCategory(null)}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Main list</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalOption, { borderColor: colors.border }]}
                onPress={() => applyBulkCategory(cat)}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowBulkCategoryModal(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New category</Text>
            <TextInput
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              style={[
                styles.input,
                { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
              ]}
              autoFocus
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint, flex: 0 }]} onPress={handleCreateCategory}>
              <Text style={styles.addBtnText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 14, alignItems: 'center' }} onPress={() => setShowCreateCategoryModal(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showImportCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import passwords</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {importEntries?.length || 0} passwords found. Where should they go?
            </Text>
            <TouchableOpacity style={[styles.modalOption, { borderColor: colors.border }]} onPress={() => finishImport(null)}>
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Main list</Text>
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
                  placeholder="Category name"
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
                  style={[styles.addBtn, { backgroundColor: colors.tint, marginTop: 4, flex: 0 }]}
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
  exportSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  exportStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  exportBack: { fontSize: 14, fontWeight: '600' },
  exportSectionTitleInline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exportOption: { paddingVertical: 12, paddingHorizontal: 16 },
  exportOptionText: { fontSize: 15, fontWeight: '600' },
  reorderHint: { fontSize: 12, marginBottom: 8 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chipsContent: { gap: 8, alignItems: 'center', paddingVertical: 2 },
  categoryChipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  categoryDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDeleteText: { fontSize: 12, fontWeight: '700' },
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
  selectBarActions: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 4 },
  selectBarAction: { fontSize: 14, fontWeight: '700' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  form: { padding: 16, borderRadius: 12, marginBottom: 16 },
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
  noteInput: { minHeight: 64, textAlignVertical: 'top' },
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
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  dragHandle: { paddingRight: 4, paddingVertical: 2 },
  dragHandleText: { fontSize: 20, fontWeight: '700' },
  site: { fontSize: 18, fontWeight: 'bold' },
  starBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  starIcon: { fontSize: 22, fontWeight: '700' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  label: { fontSize: 12, marginTop: 6, marginBottom: 2 },
  value: { fontSize: 15 },
  actions: { flexDirection: 'row', marginTop: 14, gap: 10, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', fontStyle: 'italic', marginTop: 40, lineHeight: 22, marginBottom: 40 },
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
