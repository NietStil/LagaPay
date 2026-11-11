import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { Icon, kleuren, type IconName } from '@/components/lagapay';
import { foutmelding, verlaatTerminal } from '@/lib/api/lagapay';
import { bevestig, meld } from '@/lib/melding';
import { zetActieveTerminal } from '@/lib/terminal';

const ICONEN: Record<string, IconName> = {
  transacties: 'bon',
  index: 'raster',
  scan: 'scan-lijn',
};

/**
 * Bottom bar of the bar terminal (app-design/terminal/*.dc.html): four equal columns, Transacties | Producten |
 * Scan as tabs plus Verlaten, which isn't a tab: it asks, stops being the terminal (actief = 0) and returns to Profiel.
 */
export function TerminalTabBar({ state, descriptors, navigation, evenementId }: BottomTabBarProps & { evenementId: string }) {
  const [verlaten, setVerlaten] = useState(false);

  const verlaat = async () => {
    const zeker = await bevestig('Terminal verlaten', 'Dit toestel is dan geen terminal meer voor dit evenement.', {
      bevestigLabel: 'Verlaten',
      destructief: true,
    });
    if (!zeker) return;
    setVerlaten(true);
    try {
      await verlaatTerminal(evenementId);
      // Unlocks the app (root layout); coming back needs the terminal code or QR code again.
      zetActieveTerminal(null);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/profiel');
    } catch (err) {
      setVerlaten(false);
      meld('Verlaten lukt niet', foutmelding(err));
    }
  };

  const knop = 'flex-1 items-center justify-center gap-1 py-1 active:opacity-70';

  return (
    <View accessibilityRole="tablist" className="flex-row border-t border-zinc-800 bg-zinc-950 px-2 pb-2.5 pt-2">
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

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            className={knop}
          >
            <Icon name={ICONEN[route.name] ?? 'info'} size={22} color={color} />
            <Text className="text-[11px] font-semibold" style={{ color }}>
              {label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => void verlaat()}
        disabled={verlaten}
        accessibilityRole="button"
        accessibilityLabel="Terminal verlaten"
        accessibilityState={{ busy: verlaten }}
        className={knop}
      >
        {verlaten ? (
          <ActivityIndicator size="small" color={kleuren.zinc400} />
        ) : (
          <Icon name="verlaten" size={22} color={kleuren.zinc400} />
        )}
        <Text className="text-[11px] font-semibold text-zinc-400">Verlaten</Text>
      </Pressable>
    </View>
  );
}
