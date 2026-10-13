import { Tabs } from 'expo-router/js-tabs';

import { Icon, LagaTabBar, kleuren } from '@/components/lagapay';

// Evenementen (index) is the initial tab and the target of Android back from the other tabs.
export const unstable_settings = {
  anchor: 'index',
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LagaTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: kleuren.zinc950 } }}
    >
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => <Icon name="ticket" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Evenementen',
          tabBarIcon: ({ color, size }) => <Icon name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profiel"
        options={{
          title: 'Profiel',
          tabBarIcon: ({ color, size }) => <Icon name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
