import { Tabs } from 'expo-router/js-tabs';

import { kleuren } from '@/components/lagapay';
import { TerminalTabBar } from '@/components/terminal/tab-bar';
import { useTerminalId } from '@/components/terminal/winkelwagen';

// Producten (index) is the initial tab.
export const unstable_settings = {
  anchor: 'index',
};

export default function TerminalTabsLayout() {
  const id = useTerminalId();

  return (
    <Tabs
      tabBar={(props) => <TerminalTabBar {...props} evenementId={id} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: kleuren.zinc950 } }}
    >
      <Tabs.Screen name="transacties" options={{ title: 'Transacties' }} />
      <Tabs.Screen name="index" options={{ title: 'Producten' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
    </Tabs>
  );
}
