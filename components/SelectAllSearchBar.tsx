import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

type Props = {
  label?: string;
  selectedCount: number;
  allSelected: boolean;
  hasItems: boolean;
  showSearch: boolean;
  onToggleSelectAll: () => void;
  onToggleSearch: () => void;
  actions?: React.ReactNode;
};

const SelectAllSearchBar = ({
  label,
  selectedCount,
  allSelected,
  hasItems,
  showSearch,
  onToggleSelectAll,
  onToggleSearch,
  actions,
}: Props) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const selectLabel = label ?? t('selectAll');
  const countLabel =
    selectedCount > 0 ? t('selectedCount', { count: selectedCount }) : selectLabel;

  return (
    <View style={[styles.selectBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        onPress={onToggleSelectAll}
        style={[styles.selectBarLeft, !hasItems && { opacity: 0.4 }]}
        disabled={!hasItems}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.tint,
              backgroundColor: allSelected ? colors.tint : 'transparent',
            },
          ]}
        >
          {allSelected ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={[styles.selectBarText, { color: colors.text }]}>{countLabel}</Text>
      </TouchableOpacity>

      <View style={styles.selectBarRight}>
        {actions}
        <TouchableOpacity
          style={[
            styles.searchIconBtn,
            {
              backgroundColor: showSearch ? colors.tint + '22' : 'transparent',
              borderColor: showSearch ? colors.tint : colors.border,
            },
          ]}
          onPress={onToggleSearch}
        >
          <Text style={{ fontSize: 15 }}>🔍</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const BulkActionText = ({
  children,
  color,
  onPress,
}: {
  children: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress}>
    <Text style={[styles.selectBarAction, { color }]}>{children}</Text>
  </TouchableOpacity>
);

export const BulkActionsRow = ({ children }: { children: React.ReactNode }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.selectBarActions}
  >
    {children}
  </ScrollView>
);

const styles = StyleSheet.create({
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  selectBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  selectBarText: { fontSize: 14, fontWeight: '600' },
  selectBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  selectBarActions: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 4 },
  selectBarAction: { fontSize: 14, fontWeight: '700' },
  searchIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

export default SelectAllSearchBar;
