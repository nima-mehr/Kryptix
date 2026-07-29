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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);

  const unlock = useCallback(() => {
    router.replace('/dashboard');
  }, [router]);

  const refreshBiometricState = useCallback(async () => {
    const [status, enabled, storedPassword] = await Promise.all([
      getBiometricStatus(),
      isBiometricEnabled(),
      SecureStore.getItemAsync(MASTER_PASSWORD_KEY),
    ]);
    setBiometricLabel(status.label);
    setBiometricAvailable(status.available);
    setBiometricEnabledState(enabled);
    setHasStoredPassword(!!storedPassword);
    return { status, enabled, storedPassword: !!storedPassword };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await refreshBiometricState();
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
  }, [refreshBiometricState]);

  const tryBiometricUnlock = async () => {
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
  };

  /** Enable biometrics from the login screen (no popup — system prompt only). */
  const setupBiometric = async () => {
    setIsLoading(true);
    try {
      const result = await authenticateWithBiometrics(
        `Confirm ${biometricLabel} to enable quick unlock`
      );
      if (result.success) {
        await setBiometricEnabled(true);
        setBiometricEnabledState(true);
      } else if (!result.cancelled && result.error) {
        Alert.alert('Could not enable', result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          unlock();
        } else {
          Alert.alert('Error', 'Incorrect master password');
        }
      } else {
        await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, masterPassword);
        setHasStoredPassword(true);
        unlock();
      }
    } catch (error) {
      console.error('SecureStore error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canUnlockWithBiometric =
    biometricAvailable && biometricEnabled && hasStoredPassword;
  const canSetupBiometric =
    biometricAvailable && !biometricEnabled && hasStoredPassword;

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
        autoFocus={!checkingBiometric}
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
        {isLoading && !canUnlockWithBiometric ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Unlock with password</Text>
        )}
      </TouchableOpacity>

      {!checkingBiometric && canUnlockWithBiometric && (
        <TouchableOpacity
          style={[
            styles.methodButton,
            { borderColor: colors.tint, backgroundColor: colors.card },
            isLoading && { opacity: 0.6 },
          ]}
          onPress={tryBiometricUnlock}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <Text style={[styles.methodButtonText, { color: colors.tint }]}>
              Unlock with {biometricLabel}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {!checkingBiometric && canSetupBiometric && (
        <TouchableOpacity
          style={[
            styles.methodButton,
            { borderColor: colors.border, backgroundColor: colors.card },
            isLoading && { opacity: 0.6 },
          ]}
          onPress={setupBiometric}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <Text style={[styles.methodButtonText, { color: colors.text }]}>
              Set up {biometricLabel} unlock
            </Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={[styles.info, { color: colors.textSecondary }]}>
        {hasStoredPassword
          ? 'Choose a login method above.'
          : 'First time? Enter a new password to create your vault.'}
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
  methodButton: {
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  methodButtonText: {
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
