import { Stack } from 'expo-router';

import { WISSEL_PARAM, kleuren } from '@/components/lagapay';

// Persoonlijk|Groep switches (wisselEvenementTab) replace the current screen and pass WISSEL_PARAM on
// native; those screens then fade in instead of sliding in like a push.
function wisselAnimatie({ route }: { route: { params?: object } }) {
  const params = route.params as Record<string, unknown> | undefined;
  return { animation: params?.[WISSEL_PARAM] ? 'fade' : 'default' } as const;
}

/** Stack for everything inside one evenement (/evenement/[id]/...). No headers; screens use ScreenHeader. */
export default function EvenementLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: kleuren.zinc950 } }}>
      <Stack.Screen name="index" options={wisselAnimatie} />
      <Stack.Screen name="groep" options={wisselAnimatie} />
      <Stack.Screen name="kaarten" options={wisselAnimatie} />
      <Stack.Screen name="kaarten-groep" options={wisselAnimatie} />
      <Stack.Screen name="groep-aanmaken" />
      <Stack.Screen name="transacties" />
      <Stack.Screen name="koppelen" />
      <Stack.Screen name="opwaarderen" />
      <Stack.Screen name="tickets" />
    </Stack>
  );
}
