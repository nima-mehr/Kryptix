import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

export type VaultSection = 'passwords' | 'recovery' | 'hardcoded';

type Props = {
  section: VaultSection;
  onChange: (section: VaultSection) => void;
};

const TABS: { key: VaultSection; labelKey: TranslationKey; danger?: boolean }[] = [
  { key: 'passwords', labelKey: 'tabPasswords' },
  { key: 'recovery', labelKey: 'tabRecovery' },
  { key: 'hardcoded', labelKey: 'tabHardcoded', danger: true },
];

const VaultSectionTabs = ({ section, onChange }: Props) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {TABS.map((tab) => {
        const active = section === tab.key;
        const activeColor = tab.danger ? colors.danger : colors.tint;
        const labelColor = tab.danger
          ? colors.danger
          : active
            ? colors.tint
            : colors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              active && {
                borderBottomColor: activeColor,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                {
                  color: labelColor,
                  fontWeight: active || tab.danger ? '700' : '600',
                },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
  },
  label: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
});

export default VaultSectionTabs;
