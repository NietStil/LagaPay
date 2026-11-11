import { Text, View } from 'react-native';

/** "2×" badge of a bestelling line (zinc-950, zinc-800 border, radius 8). */
export function AantalLabel({ aantal }: { aantal: number }) {
  return (
    <View className="h-[26px] min-w-[30px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-1">
      <Text className="text-[13px] font-bold text-zinc-300">{aantal}×</Text>
    </View>
  );
}
