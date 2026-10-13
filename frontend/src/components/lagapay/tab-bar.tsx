import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { kleuren } from './kleuren';

/**
 * Bottom tab bar from the design (Main.dc.html): zinc-950, zinc-800 top border, 24px icon above an
 * 11px semibold label; active purple-300, inactive zinc-400. Used as `tabBar` in (tabs)/_layout.tsx.
 * Each Tabs.Screen provides `title` and `tabBarIcon`.
 */
export function LagaTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row justify-around border-t border-zinc-800 bg-zinc-950 px-6 pt-2.5"
      // Design: 24px bottom padding on a phone with a 34px home indicator.
      style={{ paddingBottom: Math.max(insets.bottom - 10, 10) }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? kleuren.purple300 : kleuren.zinc400;
        const label = typeof options.title === 'string' ? options.title : route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            testID={options.tabBarButtonTestID}
            className="min-w-[72px] items-center gap-1 active:opacity-70"
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text className="text-[11px] font-semibold" style={{ color }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
