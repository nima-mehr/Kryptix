import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type VaultSection = 'passwords' | 'recovery' | 'hardcoded';

type Props = {
  section: VaultSection;
  onChange: (section: VaultSection) => void;
};

const TABS: { key: VaultSection; label: string; danger?: boolean }[] = [
  { key: 'passwords', label: 'Passwords' },
  { key: 'recovery', label: 'Recovery phrases' },
  { key: 'hardcoded', label: 'Hardcoded password', danger: true },
];

const VaultSectionTabs = ({ section, onChange }: Props) => {
  const { colors } = useTheme();

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
              numberOfLines={1}
            >
              {tab.label}
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
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default VaultSectionTabs;
