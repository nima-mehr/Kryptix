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
import { exportAsJSON, exportAsCSV, importFromFile } from '../utils/importExport';
import { useTheme, ThemeMode } from '../context/ThemeContext';

// ====================== PASSWORD STRENGTH ======================
type StrengthLevel = {
  score: number;
  label: string;
  color: string;
  feedback: string;
};

const calculateStrength = (password: string): StrengthLevel => {
  if (!password) {
    return { score: 0, label: '', color: '#e0e0e0', feedback: '' };
  }

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

// ====================== COMPONENT ======================
const DashboardScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, mode, setMode } = useTheme();

  const [vault, setVault] = useState<PasswordEntry[]>([]);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const isEditing = editingId !== null;

  useEffect(() => {
    const loadData = async () => {
      const data = await loadVault();
      setVault(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const clearForm = useCallback(() => {
    setSite('');
    setUsername('');
    setPassword('');
    setShowFormPassword(false);
    setEditingId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
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
    }, [showThemePicker, showExportMenu, confirmingDeleteId, editingId, clearForm])
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
    setUsername(entry.username);
    setPassword(entry.password);
    setShowFormPassword(false);
    setConfirmingDeleteId(null);
  };

  const handleSave = async () => {
    if (!site || !username || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      if (isEditing && editingId) {
        await updatePassword(editingId, { site, username, password });
      } else {
        await addPassword({ site, username, password });
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
    if (editingId === id) {
      clearForm();
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
      const result = await importFromFile();
      if (result.total === 0) return; // user cancelled

      setVault(await loadVault());

      Alert.alert(
        'Import complete',
        `Imported: ${result.imported}\nSkipped (duplicates): ${result.skipped}\nTotal in file: ${result.total}`
      );
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Could not import file');
    }
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
      {/* Header */}
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

      {/* Theme Picker */}
      {showThemePicker && (
        <View style={[styles.themePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.themeOption,
                mode === opt.key && { backgroundColor: colors.tint + '22' },
              ]}
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

      {/* Import / Export bar */}
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
            <Text style={[styles.exportOptionHint, { color: colors.textSecondary }]}>
              Full backup (recommended)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportOption} onPress={handleExportCSV}>
            <Text style={[styles.exportOptionText, { color: colors.text }]}>Export as CSV</Text>
            <Text style={[styles.exportOptionHint, { color: colors.textSecondary }]}>
              Compatible with Chrome / Firefox
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add / Edit Form */}
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
          placeholder="Site / App"
          placeholderTextColor={colors.textSecondary}
          value={site}
          onChangeText={setSite}
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        />
        <TextInput
          placeholder="Username / Email"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
          autoCapitalize="none"
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
            style={[
              styles.copyInputBtn,
              { backgroundColor: colors.tint + '18' },
              !password && { opacity: 0.4 },
            ]}
            onPress={() => setShowFormPassword((prev) => !prev)}
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
            <Text
              style={[
                styles.copyInputBtnText,
                { color: isFormCopied ? colors.success : colors.tint },
              ]}
            >
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
                    {
                      backgroundColor: i <= strength.score ? strength.color : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.strengthTextRow}>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
              <Text style={[styles.strengthFeedback, { color: colors.textSecondary }]}>
                {strength.feedback}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.buttonSecondary }]}
            onPress={() => generatePassword()}
          >
            <Text style={styles.generateBtnText}>Generate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            onPress={handleSave}
          >
            <Text style={styles.addBtnText}>{isEditing ? 'Update' : 'Add Password'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Password List */}
      <FlatList
        data={vault}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
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
              <Text style={[styles.site, { color: colors.text }]}>{item.site}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
              <Text style={[styles.value, { color: colors.text }]}>{item.username}</Text>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={styles.passwordRow}>
                <Text style={[styles.value, { color: colors.text }]}>
                  {isVisible ? item.password : '••••••••••••'}
                </Text>
              </View>

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
                      <Text
                        style={[
                          styles.actionText,
                          { color: isCopied ? colors.success : colors.text },
                        ]}
                      >
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
            No passwords saved yet.\nAdd your first one above!
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 15,
  },
  themePicker: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  ioBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  ioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  ioBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  exportMenu: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exportOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  exportOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  exportOptionHint: {
    fontSize: 12,
    marginTop: 2,
  },
  form: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelEditText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  copyInputBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  copyInputBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  strengthContainer: {
    marginBottom: 14,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  strengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  strengthTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  strengthFeedback: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  generateBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  addBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  entry: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  site: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    marginTop: 6,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
  },
  passwordRow: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 40,
    lineHeight: 22,
  },
});

export default DashboardScreen;
