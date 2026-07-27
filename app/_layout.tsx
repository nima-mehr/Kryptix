import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

function RootLayoutNav() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        initialRouteName="login"
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: false,
        }}
      >
        <Stack.Screen
          name="login"
          options={{ title: 'Kryptix - Login', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="dashboard"
          options={{ title: 'Kryptix - Dashboard', headerShown: false, gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
