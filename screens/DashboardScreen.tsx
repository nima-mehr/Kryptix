import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Clipboard,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SelectAllSearchBar, {
  BulkActionText,
  BulkActionsRow,
} from '../components/SelectAllSearchBar';
import KryptixBackupModal from '../components/KryptixBackupModal';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
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
  labelKey: string;
  color: string;
  feedbackKey: string;
};

type ExportFormat = 'json' | 'csv';
type ListFilter = string | null;
type KryptixMode = 'menu' | 'import' | 'export';

type DashboardProps = {
  /** When true, parent (VaultHome) already shows title / theme / logout */
  embedded?: boolean;
};

const FAVORITES_FILTER = '__favorites__';

const calculateStrength = (password: string): StrengthLevel => {
  if (!password) return { score: 0, labelKey: '', color: '#e0e0e0', feedbackKey: '' };

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

  if (password.length < 8) feedbacks.push('strengthTooShort');
  if (!hasLower || !hasUpper) feedbacks.push('strengthMixCase');
  if (!hasNumber) feedbacks.push('strengthAddNumbers');
  if (!hasSymbol) feedbacks.push('strengthAddSymbols');

  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin'];
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
    feedbacks.push('strengthAvoidCommon');
  }

  if (/(.)\1{2,}/.test(password) || /012|123|234|345|456|567|678|789|abc|bcd|cde/.test(password.toLowerCase())) {
    score = Math.max(0, score - 1);
    feedbacks.push('strengthAvoidSequences');
  }

  score = Math.min(4, Math.max(0, score));

  const levels: Record<number, { labelKey: string; color: string }> = {
    0: { labelKey: 'strengthVeryWeak', color: '#d32f2f' },
    1: { labelKey: 'strengthWeak', color: '#f57c00' },
    2: { labelKey: 'strengthFair', color: '#fbc02d' },
    3: { labelKey: 'strengthStrong', color: '#388e3c' },
    4: { labelKey: 'strengthVeryStrong', color: '#1b5e20' },
  };

  return {
    score,
    labelKey: levels[score].labelKey,
    color: levels[score].color,
    feedbackKey: feedbacks.length > 0 ? feedbacks[0] : 'strengthLooksGood',
  };
};

const matchesSearch = (entry: PasswordEntry, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    entry.site.toLowerCase().includes(q) ||
    (entry.url || '').toLowerCase().includes(q) ||
    entry.username.toLowerCase().includes(q) ||
    (entry.notes || '').toLowerCase().includes(q) ||
    (entry.category || '').toLowerCase().includes(q)
  );
};

const swap = <T,>(arr: T[], i: number, j: number): T[] => {
  const next = [...arr];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
};

const DashboardScreen = ({ embedded = false }: DashboardProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();
  const { t } = useLanguage();

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingDeleteCategory, setConfirmingDeleteCategory] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [showKryptixBackup, setShowKryptixBackup] = useState(false);
  const [kryptixBackupMode, setKryptixBackupMode] = useState<KryptixMode>('menu');

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

  const filteredVault = useMemo(() => {
    let list = vault;
    if (listFilter === FAVORITES_FILTER) list = vault.filter((e) => e.favorite);
    else if (listFilter) list = vault.filter((e) => e.category === listFilter);
    if (searchQuery.trim()) list = list.filter((e) => matchesSearch(e, searchQuery));
    return list;
  }, [vault, listFilter, searchQuery]);

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

  const closeImportMenu = useCallback(() => {
    setShowImportMenu(false);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const openKryptixBackup = useCallback((mode: KryptixMode = 'menu') => {
    setShowImportMenu(false);
    setShowExportMenu(false);
    setExportFormat(null);
    setKryptixBackupMode(mode);
    setShowKryptixBackup(true);
  }, []);

  const onKryptixBackupClose = useCallback(async () => {
    setShowKryptixBackup(false);
    setKryptixBackupMode('menu');
    try {
      const [data, cats] = await Promise.all([loadVault(), loadCategories()]);
      setVault(data);
      setCategories(cats);
    } catch {
      // ignore
    }
  }, []);

  const toggleSearch = () => {
    if (showSearch) closeSearch();
    else {
      setShowThemePicker(false);
      setShowSearch(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showKryptixBackup) {
          setShowKryptixBackup(false);
          setKryptixBackupMode('menu');
          return true;
        }
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
        if (showSearch) {
          closeSearch();
          return true;
        }
        if (showThemePicker) {
          setShowThemePicker(false);
          return true;
        }
        if (showImportMenu) {
          closeImportMenu();
          return true;
        }
        if (showExportMenu) {
          if (exportFormat) setExportFormat(null);
          else closeExportMenu();
          return true;
        }
        if (confirmingDeleteCategory) {
          setConfirmingDeleteCategory(null);
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
      showKryptixBackup,
      showBulkCategoryModal,
      showCreateCategoryModal,
      showImportCategoryModal,
      showSearch,
      showThemePicker,
      showImportMenu,
      showExportMenu,
      exportFormat,
      confirmingDeleteCategory,
      selectedCount,
      confirmingDeleteId,
      editingId,
      clearForm,
      closeExportMenu,
      closeImportMenu,
      closeSearch,
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
      Alert.alert(t('error'), t('fillNameUserPass'));
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
      Alert.alert(t('error'), isEditing ? t('failedUpdatePassword') : t('failedSavePassword'));
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
      Alert.alert(t('error'), t('couldNotUpdateFavorite'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAllFiltered = () => {
    if (filteredVault.length === 0) return;
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
      t('deleteSelected'),
      t('deleteSelectedMsg', { count: selectedCount }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
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
      Alert.alert(t('error'), t('couldNotUpdateFavorites'));
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
      Alert.alert(t('error'), e?.message || t('couldNotMovePasswords'));
    }
  };

  const movePassword = async (id: string, direction: -1 | 1) => {
    const idx = filteredVault.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= filteredVault.length) return;

    const reordered = swap(filteredVault, idx, target);
    try {
      const next =
        listFilter === null && !searchQuery.trim()
          ? reordered
          : applyFilteredReorder(vault, reordered);
      await saveVault(next);
      setVault(next);
    } catch {
      Alert.alert(t('error'), t('couldNotSaveOrder'));
    }
  };

  const moveCategory = async (name: string, direction: -1 | 1) => {
    const idx = categories.indexOf(name);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= categories.length) return;

    const next = swap(categories, idx, target);
    try {
      setCategories(next);
      await reorderCategories(next);
    } catch {
      Alert.alert(t('error'), t('couldNotSaveCategoryOrder'));
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
      Alert.alert(t('error'), t('enterCategoryName'));
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
      Alert.alert(t('error'), e?.message || t('couldNotCreateCategory'));
    }
  };

  const toggleExportMenu = () => {
    if (showExportMenu) closeExportMenu();
    else {
      setShowImportMenu(false);
      setExportFormat(null);
      setShowExportMenu(true);
    }
  };

  const toggleImportMenu = () => {
    if (showImportMenu) closeImportMenu();
    else {
      setShowExportMenu(false);
      setExportFormat(null);
      setShowImportMenu(true);
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
          Alert.alert(t('nothingToExport'), t('noPasswordsInFilter'));
          return;
        }
      } else {
        entries = selectedEntries;
        if (entries.length === 0) {
          Alert.alert(t('nothingToExport'), t('selectPasswordsFirst'));
          return;
        }
      }
      if (format === 'json') await exportAsJSON(entries);
      else await exportAsCSV(entries);
    } catch (e: any) {
      Alert.alert(t('exportFailed'), e?.message || t('couldNotExport'));
    }
  };

  const handleImportJsonCsv = async () => {
    closeImportMenu();
    try {
      const entries = await pickAndParseImportFile();
      if (!entries) return;
      setImportEntries(entries);
      setShowImportCategoryModal(true);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (e: any) {
      Alert.alert(t('importFailed'), e?.message || t('couldNotImport'));
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
        t('importComplete'),
        t('importCompleteMsg', {
          imported: result.imported,
          skipped: result.skipped,
          total: result.total,
          category: cat || t('mainList'),
        })
      );
    } catch (e: any) {
      Alert.alert(t('importFailed'), e?.message || t('couldNotSaveImport'));
    }
  };

  const confirmCategoryDelete = async (name: string) => {
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
      setConfirmingDeleteCategory(null);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || t('couldNotDeleteCategory'));
    }
  };

  const handleLogout = () => router.replace('/login');

  const themeOptions: { key: ThemeMode; labelKey: string; icon: string }[] = [
    { key: 'light', labelKey: 'light', icon: '☀️' },
    { key: 'dark', labelKey: 'dark', icon: '🌙' },
    { key: 'system', labelKey: 'system', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: embedded ? 0 : insets.top + 12,
          },
        ]}
      >
        <Text style={{ color: colors.text }}>{t('loadingVault')}</Text>
      </View>
    );
  }

  const isFormCopied = copiedId === 'form';
  const formatLabel = exportFormat === 'json' ? 'JSON' : exportFormat === 'csv' ? 'CSV' : '';
  const filterLabel =
    listFilter === FAVORITES_FILTER ? t('favorites') : listFilter || t('all');
  const hasActiveSearch = searchQuery.trim().length > 0;

  const renderPasswordItem = ({ item, index }: { item: PasswordEntry; index: number }) => {
    const isVisible = visiblePasswords[item.id];
    const isCopied = copiedId === item.id;
    const isConfirmingDelete = confirmingDeleteId === item.id;
    const isBeingEdited = editingId === item.id;
    const isSelected = !!selectedIds[item.id];
    const isFav = !!item.favorite;
    const canUp = index > 0;
    const canDown = index < filteredVault.length - 1;

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
          <View style={styles.reorderCol}>
            <TouchableOpacity
              onPress={() => movePassword(item.id, -1)}
              disabled={!canUp}
              style={[styles.reorderBtn, !canUp && { opacity: 0.25 }]}
              hitSlop={{ top: 4, bottom: 2, left: 6, right: 6 }}
            >
              <Text style={[styles.reorderBtnText, { color: colors.textSecondary }]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => movePassword(item.id, 1)}
              disabled={!canDown}
              style={[styles.reorderBtn, !canDown && { opacity: 0.25 }]}
              hitSlop={{ top: 2, bottom: 4, left: 6, right: 6 }}
            >
              <Text style={[styles.reorderBtnText, { color: colors.textSecondary }]}>▼</Text>
            </TouchableOpacity>
          </View>

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
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('url')}</Text>
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
              {item.url}
            </Text>
          </>
        ) : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('username')}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{item.username}</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('password')}</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {isVisible ? item.password : '••••••••••••'}
        </Text>

        {item.notes ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('note')}</Text>
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
                  {isVisible ? t('hide') : t('show')}
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
                  {isCopied ? t('copied') : t('copy')}
                </Text>
              </TouchableOpacity>
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

  const listHeader = (
    <>
      {!embedded ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>🔐 {t('kryptixVault')}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setShowThemePicker(!showThemePicker);
                if (!showThemePicker) setShowSearch(false);
              }}
            >
              <Text style={{ fontSize: 16 }}>
                {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '⚙️'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={[styles.logoutText, { color: colors.tint }]}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!embedded && showThemePicker && (
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
              <Text style={[styles.themeOptionText, { color: colors.text }]}>{t(opt.labelKey)}</Text>
              {mode === opt.key && <Text style={{ color: colors.tint }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.ioBar}>
        <TouchableOpacity
          style={[styles.ioBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleImportMenu}
        >
          <Text style={[styles.ioBtnText, { color: colors.text }]}>{t('import')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ioBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleExportMenu}
        >
          <Text style={[styles.ioBtnText, { color: colors.text }]}>{t('export')}</Text>
        </TouchableOpacity>
      </View>

      {showImportMenu && (
        <View style={[styles.exportMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.exportSectionTitle, { color: colors.textSecondary }]}>
            {t('chooseFormat')}
          </Text>
          <TouchableOpacity style={styles.exportOption} onPress={handleImportJsonCsv}>
            <Text style={[styles.exportOptionText, { color: colors.text }]}>JSON / CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportOption} onPress={() => openKryptixBackup('import')}>
            <Text style={[styles.exportOptionText, { color: colors.text }]}>.kryptix</Text>
          </TouchableOpacity>
        </View>
      )}

      {showExportMenu && (
        <View style={[styles.exportMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {!exportFormat ? (
            <>
              <Text style={[styles.exportSectionTitle, { color: colors.textSecondary }]}>
                {t('chooseFormat')}
              </Text>
              <TouchableOpacity style={styles.exportOption} onPress={() => setExportFormat('json')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportOption} onPress={() => setExportFormat('csv')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportOption} onPress={() => openKryptixBackup('export')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>.kryptix</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.exportStepHeader}>
                <TouchableOpacity onPress={() => setExportFormat(null)}>
                  <Text style={[styles.exportBack, { color: colors.tint }]}>{t('formatBack')}</Text>
                </TouchableOpacity>
                <Text style={[styles.exportSectionTitleInline, { color: colors.textSecondary }]}>
                  {t('exportAs', { format: formatLabel })}
                </Text>
              </View>
              <TouchableOpacity style={styles.exportOption} onPress={() => runExport(exportFormat, 'all')}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>
                  {t('allCount', { count: vault.length })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => runExport(exportFormat, 'category')}
              >
                <Text style={[styles.exportOptionText, { color: colors.text }]}>
                  {t('filterCount', { label: filterLabel, count: filteredVault.length })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportOption, selectedCount === 0 && { opacity: 0.45 }]}
                onPress={() => runExport(exportFormat, 'selected')}
                disabled={selectedCount === 0}
              >
                <Text style={[styles.exportOptionText, { color: colors.text }]}>
                  {t('selectedExport', { count: selectedCount })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: listFilter === null ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            setListFilter(null);
            setConfirmingDeleteCategory(null);
          }}
        >
          <Text style={[styles.chipText, { color: listFilter === null ? '#fff' : colors.text }]}>
            {t('all')}
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
          onPress={() => {
            setListFilter(FAVORITES_FILTER);
            setConfirmingDeleteCategory(null);
          }}
        >
          <Text
            style={[
              styles.chipText,
              { color: listFilter === FAVORITES_FILTER ? '#fff' : colors.text },
            ]}
          >
            {t('favoritesStar')}
          </Text>
        </TouchableOpacity>

        {categories.map((cat, catIndex) => {
          const isSelected = listFilter === cat;
          const isConfirmingDelete = confirmingDeleteCategory === cat;
          const canLeft = catIndex > 0;
          const canRight = catIndex < categories.length - 1;
          return (
            <View key={cat} style={styles.categoryChipRow}>
              <TouchableOpacity
                onPress={() => moveCategory(cat, -1)}
                disabled={!canLeft}
                style={[styles.catReorderBtn, !canLeft && { opacity: 0.25 }]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setListFilter(cat);
                  if (confirmingDeleteCategory !== cat) setConfirmingDeleteCategory(null);
                }}
                onLongPress={() => setConfirmingDeleteCategory(cat)}
                delayLongPress={350}
              >
                <Text style={[styles.chipText, { color: isSelected ? '#fff' : colors.text }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveCategory(cat, 1)}
                disabled={!canRight}
                style={[styles.catReorderBtn, !canRight && { opacity: 0.25 }]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>›</Text>
              </TouchableOpacity>
              {isConfirmingDelete && (
                <View style={styles.categoryConfirmRow}>
                  <TouchableOpacity
                    style={[styles.categoryConfirmBtn, { backgroundColor: colors.overlay }]}
                    onPress={() => setConfirmingDeleteCategory(null)}
                  >
                    <Text style={[styles.categoryConfirmText, { color: colors.text }]}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.categoryConfirmBtn, { backgroundColor: colors.dangerBackground }]}
                    onPress={() => confirmCategoryDelete(cat)}
                  >
                    <Text style={[styles.categoryConfirmText, { color: colors.danger }]}>{t('remove')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.tint, borderStyle: 'dashed' }]}
          onPress={openCreateCategory}
        >
          <Text style={[styles.chipText, { color: colors.tint }]}>{t('add')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.form, { backgroundColor: colors.card }]}>
        {isEditing && (
          <View style={styles.editingBanner}>
            <Text style={[styles.editingText, { color: colors.tint }]}>{t('editingEntry')}</Text>
            <TouchableOpacity onPress={clearForm}>
              <Text style={[styles.cancelEditText, { color: colors.textSecondary }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          placeholder={t('name')}
          placeholderTextColor={colors.textSecondary}
          value={site}
          onChangeText={setSite}
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />
        <TextInput
          placeholder={t('url')}
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />
        <TextInput
          placeholder={t('username')}
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />

        <View style={styles.passwordInputRow}>
          <TextInput
            placeholder={t('password')}
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
              {showFormPassword ? t('hide') : t('show')}
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
              {isFormCopied ? t('copied') : t('copy')}
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
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.labelKey ? t(strength.labelKey) : ''}
              </Text>
              <Text style={[styles.strengthFeedback, { color: colors.textSecondary }]}>
                {strength.feedbackKey ? t(strength.feedbackKey) : ''}
              </Text>
            </View>
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
            { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
          ]}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.buttonSecondary }]}
            onPress={() => generatePassword()}
          >
            <Text style={styles.generateBtnText}>{t('generate')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={handleSave}>
            <Text style={styles.addBtnText}>{isEditing ? t('update') : t('addPassword')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SelectAllSearchBar
        selectedCount={selectedCount}
        allSelected={allFilteredSelected}
        hasItems={filteredVault.length > 0}
        showSearch={showSearch}
        onToggleSelectAll={toggleSelectAllFiltered}
        onToggleSearch={toggleSearch}
        actions={
          selectedCount > 0 ? (
            <BulkActionsRow>
              <BulkActionText color={colors.textSecondary} onPress={clearSelection}>
                {t('clear')}
              </BulkActionText>
              <BulkActionText color={colors.tint} onPress={() => setShowBulkCategoryModal(true)}>
                {t('move')}
              </BulkActionText>
              <BulkActionText color={colors.tint} onPress={handleBulkFavorite}>
                {selectedAllFavorited ? t('unstar') : t('star')}
              </BulkActionText>
              <BulkActionText color={colors.danger} onPress={handleBulkDelete}>
                {t('delete')}
              </BulkActionText>
            </BulkActionsRow>
          ) : null
        }
      />

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchPasswords')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {hasActiveSearch ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('close')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  const emptyMessage = hasActiveSearch
    ? t('noResultsFor', { query: searchQuery.trim() })
    : listFilter === FAVORITES_FILTER
      ? t('noFavoritesYet')
      : listFilter
        ? t('noPasswordsInCategory', { category: listFilter })
        : t('noPasswordsYet');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: embedded ? 0 : insets.top + 12,
          paddingBottom: embedded ? 0 : insets.bottom + 8,
        },
      ]}
    >
      <FlatList
        style={styles.list}
        data={filteredVault}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={renderPasswordItem}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>{emptyMessage}</Text>
        }
      />

      <KryptixBackupModal
        visible={showKryptixBackup}
        onClose={onKryptixBackupClose}
        initialMode={kryptixBackupMode}
      />

      <Modal visible={showBulkCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('moveSelected')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {t('moveSelectedMsg', { count: selectedCount })}
            </Text>
            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => applyBulkCategory(null)}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }]}>{t('mainList')}</Text>
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
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('newCategory')}</Text>
            <TextInput
              placeholder={t('categoryName')}
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
              <Text style={styles.addBtnText}>{t('create')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 14, alignItems: 'center' }} onPress={() => setShowCreateCategoryModal(false)}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showImportCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('importPasswords')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {t('passwordsFoundWhere', { count: importEntries?.length || 0 })}
            </Text>
            <TouchableOpacity style={[styles.modalOption, { borderColor: colors.border }]} onPress={() => finishImport(null)}>
              <Text style={[styles.modalOptionText, { color: colors.text }]}>{t('mainList')}</Text>
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
                <Text style={[styles.modalOptionText, { color: colors.tint }]}>{t('createNewCategory')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  placeholder={t('categoryName')}
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
                  <Text style={styles.addBtnText}>{t('importIntoNewCategory')}</Text>
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
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('cancel')}</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
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
  chipsRow: { marginBottom: 12, maxHeight: 48 },
  chipsContent: { gap: 8, alignItems: 'center', paddingVertical: 2 },
  categoryChipRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  catReorderBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  categoryConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  categoryConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryConfirmText: { fontSize: 12, fontWeight: '700' },
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
  reorderCol: { marginRight: 4, alignItems: 'center' },
  reorderBtn: { paddingVertical: 1, paddingHorizontal: 4 },
  reorderBtnText: { fontSize: 11, fontWeight: '700' },
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
