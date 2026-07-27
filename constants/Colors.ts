/**
 * Color palette for Kryptix - Light & Dark modes
 */

const tintColorLight = '#0066cc';
const tintColorDark = '#4da3ff';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    background: '#f5f5f5',
    card: '#ffffff',
    border: '#e0e0e0',
    inputBackground: '#fafafa',
    tint: tintColorLight,
    icon: '#687076',
    danger: '#d32f2f',
    dangerBackground: '#ffebee',
    success: '#2e7d32',
    successBackground: '#e8f5e9',
    buttonSecondary: '#6c757d',
    overlay: 'rgba(0,0,0,0.05)',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#0d0d0d',
    card: '#1a1a1a',
    border: '#2a2a2a',
    inputBackground: '#252525',
    tint: tintColorDark,
    icon: '#9BA1A6',
    danger: '#ef5350',
    dangerBackground: '#3b1c1c',
    success: '#66bb6a',
    successBackground: '#1b2e1c',
    buttonSecondary: '#555',
    overlay: 'rgba(255,255,255,0.05)',
  },
};

export type ThemeColors = typeof Colors.light;
