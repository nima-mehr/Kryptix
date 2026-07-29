import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Placeholder for recovery-phrase vault entries.
 * Full CRUD will be added in a follow-up.
 */
const RecoveryPhrasesPanel = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Recovery phrases</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Store seed phrases and recovery keys here. This section is a placeholder — we will add
          add / edit / list next.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21 },
});

export default RecoveryPhrasesPanel;
