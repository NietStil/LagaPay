import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DarkTheme, ThemeProvider, Stack, router, usePathname, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import "../global.css";

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { kleuren } from '@/components/lagapay/kleuren';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { isPendingLinkPad, setPendingLink, takePendingLink } from '@/lib/pending-link';

SplashScreen.preventAutoHideAsync();

// The app is dark-only (design: zinc-950 background, purple accent).
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: kleuren.purple300,
    background: kleuren.zinc950,
    card: kleuren.zinc950,
    text: kleuren.zinc50,
    border: kleuren.zinc800,
  },
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const doorsturenRef = useRef(false);

  // Auth guard. This is the only place that navigates after login/registration:
  // login.tsx and register.tsx just update the auth state.
  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!isAuthenticated && !inAuthGroup) {
      // Remember a join deep link (/e/{code}, /g/{code}) so it can continue after login.
      if (isPendingLinkPad(pathname)) {
        void setPendingLink(pathname);
      }
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // The effect can re-run while the pending link is being read; only redirect once.
      if (doorsturenRef.current) return;
      doorsturenRef.current = true;
      void takePendingLink().then((pending) => {
        doorsturenRef.current = false;
        // Drop login/register (e.g. login → register) from the history first.
        if (router.canDismiss()) router.dismissAll();
        router.replace((pending ?? '/') as Href);
      });
    }
  }, [isAuthenticated, isLoading, segments, pathname]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={kleuren.purple300} />
      </View>
    );
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: kleuren.zinc950 } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" options={{ animation: 'fade' }} />
        <Stack.Screen name="toevoegen" />
        <Stack.Screen name="evenement/[id]" />
        <Stack.Screen name="wachtwoord" />
        <Stack.Screen name="e/[code]" options={{ animation: 'fade' }} />
        <Stack.Screen name="g/[code]" options={{ animation: 'fade' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: kleuren.zinc950,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
