import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  authenticateWithBiometrics,
  getBiometricStatus,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../utils/biometrics';
import IntroSphereAnimation from '../components/IntroSphereAnimation';

const MASTER_PASSWORD_KEY = 'kryptix_master_password';

const LoginScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [masterPassword, setMasterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [checkingBiometric, setCheckingBiometric] = useState(true);
  const [introReady, setIntroReady] = useState(false);
  const [logoCenter, setLogoCenter] = useState<{ x: number; y: number } | undefined>(
    undefined
  );

  const containerRef = useRef<View>(null);
  const sphereAnchorRef = useRef<View>(null);

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

  const measureLogoTarget = () => {
    containerRef.current?.measureInWindow((cX, cY) => {
      sphereAnchorRef.current?.measureInWindow((x, y, width, height) => {
        setLogoCenter({
          x: x + width / 2 - cX,
          y: y + height / 2 - cY,
        });
      });
    });
  };

  const onBiometricPress = async () => {
    setIsLoading(true);
    try {
      if (biometricEnabled) {
        const result = await authenticateWithBiometrics();
        if (result.success) {
          unlock();
          return;
        }
        if (!result.cancelled && result.error) {
          Alert.alert(t('unlockFailed'), result.error);
        }
      } else {
        const result = await authenticateWithBiometrics(
          `Confirm ${biometricLabel} to enable quick unlock`
        );
        if (result.success) {
          await setBiometricEnabled(true);
          setBiometricEnabledState(true);
        } else if (!result.cancelled && result.error) {
          Alert.alert(t('couldNotEnable'), result.error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!masterPassword) {
      Alert.alert(t('error'), t('enterMasterPassword'));
      return;
    }

    setIsLoading(true);

    try {
      const storedPassword = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);

      if (storedPassword) {
        if (masterPassword === storedPassword) {
          unlock();
        } else {
          Alert.alert(t('error'), t('incorrectMasterPassword'));
        }
      } else {
        await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, masterPassword);
        setHasStoredPassword(true);
        unlock();
      }
    } catch (error) {
      console.error('SecureStore error:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const showBiometricButton =
    !checkingBiometric && biometricAvailable && hasStoredPassword;

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <View
      ref={containerRef}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      onLayout={measureLogoTarget}
    >
      <IntroSphereAnimation
        logoCenterX={logoCenter?.x}
        logoCenterY={logoCenter?.y}
        onReady={() => setIntroReady(true)}
      />

      <View style={styles.titleRow} onLayout={measureLogoTarget}>
        <View
          ref={sphereAnchorRef}
          style={styles.sphereAnchor}
          onLayout={measureLogoTarget}
          collapsable={false}
        />
        <Text style={[styles.title, { color: colors.text }]}>KRYPTIX</Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('offlinePasswordManager')}
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
            textAlign,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
        placeholder={t('masterPassword')}
        placeholderTextColor={colors.textSecondary}
        value={masterPassword}
        onChangeText={setMasterPassword}
        secureTextEntry
        autoFocus={introReady && !checkingBiometric}
        editable={!isLoading}
        onSubmitEditing={handleLogin}
      />

      <View style={[styles.actionsRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.tint },
            (isLoading || !masterPassword) && { opacity: 0.6 },
            showBiometricButton && { flex: 1 },
          ]}
          onPress={handleLogin}
          disabled={isLoading || !masterPassword}
        >
          {isLoading && !showBiometricButton ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('unlock')}</Text>
          )}
        </TouchableOpacity>

        {showBiometricButton && (
          <TouchableOpacity
            style={[
              styles.bioButton,
              {
                borderColor: biometricEnabled ? colors.tint : colors.border,
                backgroundColor: colors.card,
              },
              isLoading && { opacity: 0.6 },
            ]}
            onPress={onBiometricPress}
            disabled={isLoading}
            accessibilityLabel={
              biometricEnabled
                ? `Unlock with ${biometricLabel}`
                : `Set up ${biometricLabel}`
            }
          >
            {isLoading ? (
              <ActivityIndicator color={colors.tint} size="small" />
            ) : (
              <Ionicons
                name="finger-print"
                size={28}
                color={biometricEnabled ? colors.tint : colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {!hasStoredPassword && !checkingBiometric && (
        <Text style={[styles.info, { color: colors.textSecondary }]}>{t('firstTimeHint')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sphereAnchor: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Orbitron',
    letterSpacing: 4,
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bioButton: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 30,
    fontStyle: 'italic',
  },
});

export default LoginScreen;
