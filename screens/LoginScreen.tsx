import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../context/ThemeContext';
import {
  authenticateWithBiometrics,
  getBiometricStatus,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../utils/biometrics';

const MASTER_PASSWORD_KEY = 'kryptix_master_password';

const LoginScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [masterPassword, setMasterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);

  const unlock = useCallback(() => {
    router.replace('/dashboard');
  }, [router]);

  const offerEnableBiometrics = useCallback(
    async (label: string) => {
      const status = await getBiometricStatus();
      if (!status.available) return;

      Alert.alert(
        `Enable ${label}?`,
        `Use ${label} to unlock your vault next time instead of typing your master password.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const result = await authenticateWithBiometrics(
                `Confirm ${label} to enable quick unlock`
              );
              if (result.success) {
                await setBiometricEnabled(true);
                Alert.alert('Enabled', `${label} unlock is on.`);
              } else if (!result.cancelled && result.error) {
                Alert.alert('Could not enable', result.error);
              }
            },
          },
        ]
      );
    },
    []
  );

  const tryBiometricUnlock = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await authenticateWithBiometrics();
      if (result.success) {
        unlock();
        return;
      }
      if (!result.cancelled && result.error) {
        Alert.alert('Unlock failed', result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [unlock]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const [status, enabled, storedPassword] = await Promise.all([
          getBiometricStatus(),
          isBiometricEnabled(),
          SecureStore.getItemAsync(MASTER_PASSWORD_KEY),
        ]);

        if (cancelled) return;

        setBiometricLabel(status.label);
        const ready = status.available && enabled && !!storedPassword;
        setCanUseBiometric(ready);

        if (ready) {
          // Auto-prompt once when the screen opens
          const result = await authenticateWithBiometrics();
          if (cancelled) return;
          if (result.success) {
            unlock();
            return;
          }
        }
      } catch (e) {
        console.error('Biometric init error:', e);
      } finally {
        if (!cancelled) setCheckingBiometric(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [unlock]);

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
          const status = await getBiometricStatus();
          const enabled = await isBiometricEnabled();
          if (status.available && !enabled) {
            await offerEnableBiometrics(status.label);
          }
          unlock();
        } else {
          Alert.alert('Error', 'Incorrect master password');
        }
      } else {
        await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, masterPassword);
        Alert.alert('Success', 'Master password created!');
        const status = await getBiometricStatus();
        if (status.available) {
          await offerEnableBiometrics(status.label);
        }
        unlock();
      }
    } catch (error) {
      console.error('SecureStore error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
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
        autoFocus={!canUseBiometric && !checkingBiometric}
        editable={!isLoading}
        onSubmitEditing={handleLogin}
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
        {isLoading && !canUseBiometric ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Unlock Vault</Text>
        )}
      </TouchableOpacity>

      {canUseBiometric && (
        <TouchableOpacity
          style={[
            styles.biometricButton,
            { borderColor: colors.tint, backgroundColor: colors.card },
            isLoading && { opacity: 0.6 },
          ]}
          onPress={tryBiometricUnlock}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <Text style={[styles.biometricButtonText, { color: colors.tint }]}>
              Unlock with {biometricLabel}
            </Text>
          )}
        </TouchableOpacity>
      )}

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
    paddingHorizontal: 30,
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
  biometricButton: {
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  biometricButtonText: {
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
