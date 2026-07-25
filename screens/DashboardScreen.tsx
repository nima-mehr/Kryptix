import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addPassword, loadVault, deletePassword, PasswordEntry } from '../utils/vault';

// ====================== PASSWORD STRENGTH ======================
type StrengthLevel = {
  score: number; // 0-4
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

  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (varietyCount >= 3) score += 1;
  if (varietyCount === 4) score += 1;

  // Penalties for common weaknesses
  if (password.length < 8) {
    feedbacks.push('Too short');
  }
  if (!hasLower || !hasUpper) {
    feedbacks.push('Mix upper & lower case');
  }
  if (!hasNumber) {
    feedbacks.push('Add numbers');
  }
  if (!hasSymbol) {
    feedbacks.push('Add symbols');
  }

  // Detect very common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123', 'letmein', 'admin'];
  if (commonPatterns.some((p) => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
    feedbacks.push('Avoid common words');
  }

  // Sequential characters penalty
  if (/(.)\1{2,}/.test(password) || /012|123|234|345|456|567|678|789|abc|bcd|cde/.test(password.toLowerCase())) {
    score = Math.max(0, score - 1);
    feedbacks.push('Avoid sequences');
  }

  // Cap score at 4
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
  const [vault, setVault] = useState<PasswordEntry[]>([]);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  const strength = useMemo(() => calculateStrength(password), [password]);

  useEffect(() => {
    const loadData = async () => {
      const data = await loadVault();
      setVault(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const generatePassword = (length = 16) => {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const handleAdd = async () => {
    if (!site || !username || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await addPassword({ site, username, password });
      setVault(await loadVault());
      setSite('');
      setUsername('');
      setPassword('');
      Alert.alert('Success', 'Password saved securely!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save password');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePassword(id);
          setVault(await loadVault());
        },
      },
    ]);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string, label: string = 'Password') => {
    if (!text) {
      Alert.alert('Nothing to copy', 'Generate or type a password first');
      return;
    }
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const handleLogout = () => {
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading your vault...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔐 Kryptix Vault</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      <View style={styles.form}>
        <TextInput
          placeholder="Site / App"
          value={site}
          onChangeText={setSite}
          style={styles.input}
        />
        <TextInput
          placeholder="Username / Email"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          autoCapitalize="none"
        />

        {/* Password field + Copy button */}
        <View style={styles.passwordInputRow}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, styles.passwordInput]}
          />
          <TouchableOpacity
            style={styles.copyInputBtn}
            onPress={() => copyToClipboard(password)}
            disabled={!password}
          >
            <Text style={[styles.copyInputBtnText, !password && { opacity: 0.4 }]}>
              Copy
            </Text>
          </TouchableOpacity>
        </View>

        {/* Strength Meter */}
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor: i <= strength.score ? strength.color : '#e0e0e0',
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.strengthTextRow}>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {strength.label}
              </Text>
              <Text style={styles.strengthFeedback}>{strength.feedback}</Text>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.generateBtn} onPress={() => generatePassword()}>
            <Text style={styles.generateBtnText}>Generate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>Add Password</Text>
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

          return (
            <View style={styles.entry}>
              <Text style={styles.site}>{item.site}</Text>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{item.username}</Text>

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <Text style={styles.value}>
                  {isVisible ? item.password : '••••••••••••'}
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => togglePasswordVisibility(item.id)}
                >
                  <Text style={styles.actionText}>{isVisible ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => copyToClipboard(item.password)}
                >
                  <Text style={styles.actionText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No passwords saved yet.\nAdd your first one above!</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  logoutText: {
    color: '#0066cc',
    fontWeight: '600',
    fontSize: 16,
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
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
    backgroundColor: '#e8f0fe',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  copyInputBtnText: {
    color: '#0066cc',
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
    color: '#888',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  generateBtn: {
    flex: 1,
    backgroundColor: '#6c757d',
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
    backgroundColor: '#0066cc',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  site: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: '#333',
  },
  passwordRow: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  deleteBtn: {
    backgroundColor: '#ffebee',
  },
  deleteText: {
    color: '#d32f2f',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 40,
    lineHeight: 22,
  },
});

export default DashboardScreen;
