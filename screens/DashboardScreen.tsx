import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { addPassword, loadVault, deletePassword, PasswordEntry } from '../utils/vault';

const DashboardScreen = () => {
  const router = useRouter();
  const [vault, setVault] = useState<PasswordEntry[]>([]);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

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

  const copyToClipboard = (text: string, label: string) => {
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
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

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
                  onPress={() => copyToClipboard(item.password, 'Password')}
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
