import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export interface SectionLabelProps {
  children: string;
  /** Purple link on the right, e.g. `{ label: 'Alles bekijken', onPress }`. */
  action?: { label: string; onPress: () => void };
  /** Other right-hand content (e.g. a second label "Gekocht · aandeel"). Ignored when `action` is set. */
  right?: ReactNode;
  /**
   * Space below the label. Design: 10px above lists (default), 14px above timelines → pass 14.
   * Use 0 when the parent already has a gap.
   */
  spacing?: number;
}

/** 12px semibold uppercase zinc-400 section heading with an optional right action. */
export function SectionLabel({ children, action, right, spacing = 10 }: SectionLabelProps) {
  return (
    <View className="flex-row items-center justify-between gap-3" style={{ marginBottom: spacing }}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="shrink text-xs font-semibold uppercase tracking-[0.8px] text-zinc-400"
      >
        {children}
      </Text>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="link" hitSlop={8} className="active:opacity-70">
          <Text className="text-[13px] font-semibold text-purple-300">{action.label}</Text>
        </Pressable>
      ) : typeof right === 'string' ? (
        <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-zinc-400">{right}</Text>
      ) : (
        (right ?? null)
      )}
    </View>
  );
}
