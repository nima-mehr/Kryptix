import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { useRouter } from 'expo-router';

const LoginScreen = () => {
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      // Check if master password exists
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        // Simplified check (replace with proper hashing in production)
        if (masterPassword === credentials.password) {
          router.push('/dashboard');
        } else {
          setError('Invalid password');
        }
      } else {
        // First-time setup: store the master password
        await Keychain.setGenericPassword('master', masterPassword);
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred');
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Kryptix</Text>
      <TextInput
        secureTextEntry
        placeholder="Enter Master Password"
        value={masterPassword}
        onChangeText={setMasterPassword}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});

export default LoginScreen;