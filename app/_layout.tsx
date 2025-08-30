import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerStyle: { backgroundColor: '#f8f8f8' },
        headerTintColor: '#333',
      }}
    >
      <Stack.Screen
        name="login"
        options={{ title: 'Kryptix - Login', headerShown: false }}
      />
      <Stack.Screen
        name="dashboard"
        options={{ title: 'Kryptix - Dashboard' }}
      />
    </Stack>
  );
}