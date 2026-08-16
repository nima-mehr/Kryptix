/**
 * Desktop biometric unlock (Windows Hello / Touch ID / Face ID).
 *
 * The master password is never left on disk in the clear: when biometrics
 * are enabled it is stored via tauri-plugin-biometry's OS-protected vault
 * and only released after a successful biometric prompt.
 */
import {
  checkStatus,
  authenticate,
  hasData,
  getData,
  setData,
  removeData,
  BiometryType,
} from "@choochmeque/tauri-plugin-biometry-api";

const DOMAIN = "com.kryptix.app";
const NAME = "master_password";
const PREF_KEY = "kryptix_biometric_enabled";

export type BiometryInfo = {
  available: boolean;
  type: BiometryType;
  label: string;
  error?: string;
};

function typeLabel(t: BiometryType): string {
  switch (t) {
    case BiometryType.TouchID:
      return "Touch ID";
    case BiometryType.FaceID:
      return "Face ID";
    case BiometryType.Iris:
      return "Iris";
    case BiometryType.Auto:
      return "Windows Hello";
    default:
      return "Biometrics";
  }
}

export async function getBiometryInfo(): Promise<BiometryInfo> {
  try {
    const status = await checkStatus();
    return {
      available: status.isAvailable,
      type: status.biometryType,
      label: typeLabel(status.biometryType),
      error: status.error,
    };
  } catch (e) {
    return {
      available: false,
      type: BiometryType.None,
      label: "Biometrics",
      error: String(e),
    };
  }
}

export function isBiometricPrefEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function setBiometricPref(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(PREF_KEY, "1");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

export async function canUnlockWithBiometrics(): Promise<boolean> {
  if (!isBiometricPrefEnabled()) return false;
  const info = await getBiometryInfo();
  if (!info.available) return false;
  try {
    return await hasData({ domain: DOMAIN, name: NAME });
  } catch {
    return false;
  }
}

export async function enableBiometrics(masterPassword: string): Promise<void> {
  const info = await getBiometryInfo();
  if (!info.available) {
    throw new Error(
      info.error || "Biometrics are not available on this device"
    );
  }
  await authenticate(`Enable ${info.label} unlock for Kryptix`, {
    allowDeviceCredential: true,
    title: "Enable biometric unlock",
    subtitle: "Confirm your identity to store the unlock key securely",
  });
  await setData({
    domain: DOMAIN,
    name: NAME,
    data: masterPassword,
  });
  setBiometricPref(true);
}

export async function disableBiometrics(): Promise<void> {
  try {
    await removeData({ domain: DOMAIN, name: NAME });
  } catch {
    /* may already be gone */
  }
  setBiometricPref(false);
}

export async function unlockWithBiometrics(): Promise<string> {
  const info = await getBiometryInfo();
  if (!info.available) {
    throw new Error("Biometrics are not available");
  }
  const response = await getData({
    domain: DOMAIN,
    name: NAME,
    reason: `Unlock Kryptix with ${info.label}`,
  });
  if (!response?.data) {
    throw new Error("No biometric unlock key found — unlock with password first");
  }
  return response.data;
}

export async function promptBiometrics(reason: string): Promise<void> {
  await authenticate(reason, {
    allowDeviceCredential: true,
    title: "Kryptix",
    subtitle: reason,
  });
}
