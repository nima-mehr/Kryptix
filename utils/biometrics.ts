import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'kryptix_biometric_enabled';

export type BiometricStatus = {
  available: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  /** User-facing label, e.g. "Face ID", "Touch ID", "Fingerprint" */
  label: string;
};

export const getBiometricStatus = async (): Promise<BiometricStatus> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware
      ? await LocalAuthentication.isEnrolledAsync()
      : false;
    const types = hasHardware
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];

    let label = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      label = 'Iris';
    }

    return {
      available: hasHardware && enrolled,
      enrolled,
      types,
      label,
    };
  } catch {
    return {
      available: false,
      enrolled: false,
      types: [],
      label: 'Biometrics',
    };
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
};

export type AuthenticateResult =
  | { success: true }
  | { success: false; error?: string; cancelled?: boolean };

/**
 * Prompt the system biometric dialog.
 * Does not unlock the vault by itself — caller decides what happens on success.
 */
export const authenticateWithBiometrics = async (
  promptMessage?: string
): Promise<AuthenticateResult> => {
  try {
    const status = await getBiometricStatus();
    if (!status.available) {
      return {
        success: false,
        error: `${status.label} is not available on this device.`,
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage ?? `Unlock Kryptix with ${status.label}`,
      cancelLabel: 'Use password',
      disableDeviceFallback: false,
      fallbackLabel: 'Use password',
    });

    if (result.success) {
      return { success: true };
    }

    const cancelled =
      result.error === 'user_cancel' ||
      result.error === 'system_cancel' ||
      result.error === 'app_cancel';

    return {
      success: false,
      cancelled,
      error: cancelled ? undefined : result.error ?? 'Authentication failed',
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Authentication failed';
    return { success: false, error: message };
  }
};
