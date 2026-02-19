import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    // headerShown: false - folosim headerul nostru custom din index.tsx
    <Stack screenOptions={{ headerShown: false }} />
  );
}