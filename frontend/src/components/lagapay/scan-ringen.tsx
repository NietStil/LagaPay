import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Icon } from './icon';

export interface ScanRingenProps {
  /** Accessibility label. Default "Klaar om je kaart te scannen". */
  label?: string;
}

/** Design (Kaart koppelen, terminal Afrekenen): three purple rings around a purple-700 circle with the NFC icon; the rings pulse slowly. */
export function ScanRingen({ label = 'Klaar om je kaart te scannen' }: ScanRingenProps) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animatie = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animatie.start();
    return () => animatie.stop();
  }, [puls]);

  // The outer rings breathe a little more than the inner one.
  const ring = (grootte: number, kleur: string, schaal: number) => (
    <Animated.View
      style={{
        position: 'absolute',
        width: grootte,
        height: grootte,
        borderRadius: grootte / 2,
        backgroundColor: kleur,
        transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, schaal] }) }],
        opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }),
      }}
    />
  );

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      className="h-[260px] w-[260px] items-center justify-center"
    >
      {ring(260, '#1a0b2e', 1.04)}
      {ring(200, '#2e1065', 1.06)}
      {ring(136, '#4c1d95', 1.08)}
      <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-purple-700">
        <Icon name="nfc" size={40} color="#ffffff" />
      </View>
    </View>
  );
}
