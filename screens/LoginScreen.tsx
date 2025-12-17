import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const MASTER_PASSWORD_KEY = 'kryptix_master_password';

const LoginScreen = () => {
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!masterPassword) {
      Alert.alert('Error', 'Please enter a master password');
      return;
    }

    setIsLoading(true);

    try {
      const storedPassword = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);

      if (storedPassword) {
        // Existing user: check password
        if (masterPassword === storedPassword) {
          router.replace('/dashboard');
        } else {
          Alert.alert('Error', 'Incorrect master password');
        }
      } else {
        // First-time user: save password and continue
        await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, masterPassword);
        Alert.alert('Success', 'Master password created!');
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('SecureStore error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Kryptix</Text>
      <Text style={styles.subtitle}>Your Offline Password Manager</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Master Password"
        value={masterPassword}
        onChangeText={setMasterPassword}
        secureTextEntry
        autoFocus
        editable={!isLoading}
      />

      <Button
        title={isLoading ? "Unlocking..." : "Unlock Vault"}
        onPress={handleLogin}
        disabled={isLoading || !masterPassword}
      />

      <Text style={styles.info}>
        First time? Just enter a new password to create your vault.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    fontSize: 18,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  info: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 30,
    fontStyle: 'italic',
  },
});

export default LoginScreen;