import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DarkTheme, ThemeProvider, Stack, router, usePathname, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import "../global.css";

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { kleuren } from '@/components/lagapay/kleuren';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { isPendingLinkPad, setPendingLink, takePendingLink } from '@/lib/pending-link';
import { laadActieveTerminal, useActieveTerminal, zetActieveTerminal } from '@/lib/terminal';

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
  const terminal = useActieveTerminal();

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

  // Bar terminal lock: after login (or at app start) check whether this account is an actieve terminal. While it is,
  // every other screen leads back into the terminal; only "Verlaten" or a closed evenement ends it.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      zetActieveTerminal(undefined);
    } else if (terminal === undefined) {
      void laadActieveTerminal();
    }
  }, [isAuthenticated, isLoading, terminal]);

  useEffect(() => {
    if (!isAuthenticated || !terminal || segments[0] === 'terminal') return;
    if (router.canDismiss()) router.dismissAll();
    router.replace(`/terminal/${terminal}`);
  }, [isAuthenticated, terminal, segments]);

  // Also wait for the terminal check, so the normal app doesn't flash before the terminal opens.
  if (isLoading || (isAuthenticated && terminal === undefined)) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={kleuren.purple300} />
      </View>
    );
  }

  // The bottom safe area keeps the app (tab bar, footers) above the Android navigation bar and
  // the iOS home indicator, so screens only handle the top inset themselves.
  return (
    <SafeAreaView edges={['bottom']} style={styles.root}>
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
          <Stack.Screen name="t/[code]" options={{ animation: 'fade' }} />
          <Stack.Screen name="k/[code]" options={{ animation: 'fade' }} />
          <Stack.Screen name="terminal/index" />
          {/* The bar terminal: no swipe back, it is left with "Verlaten". */}
          <Stack.Screen name="terminal/[id]" options={{ gestureEnabled: false }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaView>
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
  root: {
    flex: 1,
    backgroundColor: kleuren.zinc950,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: kleuren.zinc950,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
