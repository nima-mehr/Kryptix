import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { addPassword, loadVault, deletePassword, PasswordEntry } from '../utils/vault';

const DashboardScreen = () => {
  const router = useRouter();
  const [vault, setVault] = useState<PasswordEntry[]>([]);
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await loadVault();
      setVault(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!site || !username || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    await addPassword({ site, username, password });
    setVault(await loadVault());
    setSite('');
    setUsername('');
    setPassword('');
    Alert.alert('Success', 'Password saved securely!');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel' },
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
      <Text style={styles.title}>Kryptix Vault</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <TextInput placeholder="Site" value={site} onChangeText={setSite} style={styles.input} />
        <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <Button title="Add Password" onPress={handleAdd} />
      </View>

      <FlatList
        data={vault}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Text style={styles.site}>{item.site}</Text>
            <Text>Username: {item.username}</Text>
            <Text>Password: {item.password}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No passwords saved yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  logoutButton: { alignSelf: 'flex-end', marginBottom: 10 },
  logoutText: { color: '#0066cc', fontWeight: '600' },
  form: { marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 10, borderRadius: 8 },
  entry: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 8, marginBottom: 10 },
  site: { fontSize: 18, fontWeight: 'bold' },
  deleteText: { color: 'red', marginTop: 10, fontWeight: '500' },
  empty: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 50 },
});

export default DashboardScreen;