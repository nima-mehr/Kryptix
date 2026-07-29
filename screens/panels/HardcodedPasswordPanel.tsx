import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Placeholder for hardcoded / emergency password entries.
 * Tab label is shown in red on the dashboard. Full CRUD comes next.
 */
const HardcodedPasswordPanel = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
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
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21 },
});

export default HardcodedPasswordPanel;
