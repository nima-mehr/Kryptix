import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Placeholder for hardcoded / emergency password entries.
 * Select-all bar matches other sections (search on the right).
 */
const HardcodedPasswordPanel = () => {
  const { colors } = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSearch = () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery('');
    } else setShowSearch(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.selectBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.selectBarLeft, { opacity: 0.4 }]}>
          <View style={[styles.checkbox, { borderColor: colors.tint }]} />
          <Text style={[styles.selectBarText, { color: colors.text }]}>Select all</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.searchIconBtn,
            {
              backgroundColor: showSearch ? colors.tint + '22' : 'transparent',
              borderColor: showSearch ? colors.tint : colors.border,
            },
          ]}
          onPress={toggleSearch}
        >
          <Text style={{ fontSize: 15 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search…"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={toggleSearch}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.danger,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.danger }]}>Hardcoded password</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Emergency or fixed credentials live here. This section is a placeholder — we will add
          add / edit / list next.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 4 },
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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21 },
});

export default HardcodedPasswordPanel;
