import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { kleuren } from './kleuren';

export type ButtonVariant = 'primary' | 'light' | 'secondary' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, { box: string; text: string; tint: string }> = {
  // purple-700, white text ("Munten terugstorten", "Kaart koppelen", "Koop ticket", "Delen")
  primary: { box: 'bg-purple-700', text: 'text-white', tint: kleuren.white },
  // zinc-50 bg, purple-950 text (Opwaarderen inside the purple hero)
  light: { box: 'bg-zinc-50', text: 'text-purple-950', tint: kleuren.purple950 },
  // zinc-900 bg, zinc-700 border ("Wachtwoord wijzigen")
  secondary: { box: 'bg-zinc-900 border border-zinc-700', text: 'text-zinc-50', tint: kleuren.zinc50 },
  // zinc-950 bg, zinc-700 border ("Kaart vervangen" inside a zinc-900 card)
  outline: { box: 'bg-zinc-950 border border-zinc-700', text: 'text-zinc-50', tint: kleuren.zinc50 },
  // red-950 bg, red-900 border, rose-300 text ("Uitloggen")
  danger: { box: 'bg-red-950 border border-red-900', text: 'text-rose-300', tint: kleuren.rose300 },
};

const SIZE: Record<ButtonSize, { box: string; text: string; icon: number }> = {
  // padding 9px 14px, radius 12, 13px ("Koop ticket", "Delen")
  sm: { box: 'px-3.5 py-[9px] rounded-xl gap-1.5', text: 'text-[13px]', icon: 16 },
  // padding 14px, radius 14, 15px (most buttons)
  md: { box: 'px-4 py-3.5 rounded-[14px] gap-2', text: 'text-[15px]', icon: 18 },
  // padding 16px, radius 16, 16px (sticky footer CTAs, terugstorten)
  lg: { box: 'px-4 py-4 rounded-2xl gap-2', text: 'text-base', icon: 20 },
};

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  /** Default 'primary'. */
  variant?: ButtonVariant;
  /** Default 'md'. */
  size?: ButtonSize;
  /** Icon left of the title, e.g. 'plus'. */
  icon?: IconName;
  /** Shows a spinner instead of the content and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the parent's width. Default: true for md/lg, false for sm. */
  fullWidth?: boolean;
  /** Extra classes for the outer Pressable (layout only, e.g. "flex-1 max-w-[220px]"). */
  className?: string;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth,
  className = '',
  accessibilityLabel,
}: ButtonProps) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  const breed = fullWidth ?? size !== 'sm';
  const uit = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={uit}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: uit, busy: loading }}
      className={`flex-row items-center justify-center ${breed ? 'self-stretch' : 'self-start'} ${v.box} ${s.box} ${
        disabled && !loading ? 'opacity-50' : 'active:opacity-80'
      } ${className}`}
    >
      {loading ? (
        <View className="items-center justify-center" style={{ height: s.icon }}>
          <ActivityIndicator size="small" color={v.tint} />
        </View>
      ) : (
        <>
          {icon ? <Icon name={icon} size={s.icon} color={v.tint} strokeWidth={2.4} /> : null}
          <Text numberOfLines={1} className={`${v.text} ${s.text} ${variant === 'light' ? 'font-bold' : 'font-semibold'}`}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export type HeroButtonProps = Omit<ButtonProps, 'variant' | 'size'>;

/** White button inside the purple HeroCard (purple-950 bold text), e.g. `<HeroButton title="Opwaarderen" icon="plus" />`. */
export function HeroButton(props: HeroButtonProps) {
  return <Button {...props} variant="light" size="md" />;
}
