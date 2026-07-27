import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';

const MASTER_PASSWORD_KEY = 'kryptix_master_password';

const LoginScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
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
        if (masterPassword === storedPassword) {
          router.replace('/dashboard');
        } else {
          Alert.alert('Error', 'Incorrect master password');
        }
      } else {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>🔐 Kryptix</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your Offline Password Manager
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Enter Master Password"
        placeholderTextColor={colors.textSecondary}
        value={masterPassword}
        onChangeText={setMasterPassword}
        secureTextEntry
        autoFocus
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.tint },
          (isLoading || !masterPassword) && { opacity: 0.6 },
        ]}
        onPress={handleLogin}
        disabled={isLoading || !masterPassword}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Unlock Vault</Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.info, { color: colors.textSecondary }]}>
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
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    padding: 15,
    fontSize: 18,
    borderRadius: 10,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 30,
    fontStyle: 'italic',
  },
});

export default LoginScreen;
