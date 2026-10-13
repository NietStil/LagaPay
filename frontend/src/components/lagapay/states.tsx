import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from './button';
import { IconBox } from './card';
import type { IconName } from './icon';
import { kleuren } from './kleuren';

export interface LoadingStateProps {
  /** Optional text under the spinner, e.g. "Evenement laden…". */
  label?: string;
}

/** Centered purple spinner; fills the available space (use as the only child of `<Screen>` or below a header). */
export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <ActivityIndicator size="large" color={kleuren.purple300} />
      {label ? <Text className="text-center text-sm text-zinc-400">{label}</Text> : null}
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  text?: string;
  /** Icon in a 52px box. Default 'info'. */
  icon?: IconName;
  /** E.g. `<Button title="Kaart koppelen" onPress={...} />` (full width). */
  action?: ReactNode;
}

/** Dashed #131316 card with icon, title, text and an optional action (design: empty groep kaart slot). */
export function EmptyState({ title, text, icon = 'info', action }: EmptyStateProps) {
  return (
    <View className="items-center gap-3.5 rounded-[20px] border-[1.5px] border-dashed border-zinc-700 bg-[#131316] px-[18px] py-6">
      <IconBox icon={icon} variant="muted" size={52} />
      <View className="items-center">
        <Text className="text-center text-base font-semibold text-zinc-50">{title}</Text>
        {text ? <Text className="mt-1 text-center text-[13px] leading-5 text-zinc-400">{text}</Text> : null}
      </View>
      {action ? <View className="self-stretch">{action}</View> : null}
    </View>
  );
}

export interface ErrorStateProps {
  /** Dutch message, e.g. `error` from `useApiData` or `foutmelding(err)`. */
  message: string;
  /** Default "Er ging iets mis". */
  title?: string;
  /** Shows an "Opnieuw proberen" button. */
  onRetry?: () => void;
  /** Label of the retry button. Default "Opnieuw proberen". */
  retryLabel?: string;
  /** Extra content under the retry button, e.g. a secondary Button "Naar evenementen". */
  action?: ReactNode;
}

/** Error card with rose icon, message, retry button and optional extra action. */
export function ErrorState({ message, title = 'Er ging iets mis', onRetry, retryLabel = 'Opnieuw proberen', action }: ErrorStateProps) {
  return (
    <View className="items-center gap-3.5 rounded-[20px] border border-zinc-800 bg-zinc-900 px-[18px] py-6">
      <IconBox icon="info" variant="muted" size={52} color={kleuren.rose300} />
      <View className="items-center">
        <Text className="text-center text-base font-semibold text-zinc-50">{title}</Text>
        <Text className="mt-1 text-center text-[13px] leading-5 text-zinc-400">{message}</Text>
      </View>
      {onRetry || action ? (
        <View className="gap-3 self-stretch">
          {onRetry ? <Button title={retryLabel} variant="secondary" onPress={onRetry} /> : null}
          {action}
        </View>
      ) : null}
    </View>
  );
}

export interface ErrorBannerProps {
  message: string;
}

/** Inline error message (rose, as on the login screen), e.g. under a form or the QR scanner. */
export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View accessibilityRole="alert" className="rounded-xl border border-rose-800/50 bg-rose-950/40 p-4">
      <Text className="text-sm font-medium text-rose-300">{message}</Text>
    </View>
  );
}
