import { Text, View } from 'react-native';

export interface AvatarProps {
  /** E.g. `lid.initialen` ("LV"). */
  initialen: string;
  /** purple-700 background (the current user, `lid.is_ik`); otherwise zinc-800. */
  highlighted?: boolean;
  /** Size in px. Default 38. */
  size?: number;
}

/** Rounded-square initials avatar (Leden lists). */
export function Avatar({ initialen, highlighted = false, size = 38 }: AvatarProps) {
  return (
    <View
      className={`shrink-0 items-center justify-center rounded-xl ${highlighted ? 'bg-purple-700' : 'bg-zinc-800'}`}
      style={{ width: size, height: size }}
    >
      <Text className="text-[13px] font-bold text-zinc-50">{initialen.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}
