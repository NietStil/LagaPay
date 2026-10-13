import { useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';

import { Icon } from './icon';
import { kleuren } from './kleuren';

/** Content never gets wider than this (tablets / desktop web). */
const MAX_BREEDTE = 640;

export interface ScreenProps {
  children: ReactNode;
  /** Vertical gap between direct children in px. Design values: 16 (Evenementen), 18 (evenement pages), 20–28 elsewhere. Default 18. */
  gap?: number;
  /** Enables pull-to-refresh. Typically `refresh` from `useApiData`. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Sticky bottom bar (border-top, zinc-950) for e.g. "Verder naar betalen" / Totaal + "Afrekenen". Handles the bottom safe area. */
  footer?: ReactNode;
  /** `false` renders a fixed, non-scrolling content area (same paddings). Default true. */
  scroll?: boolean;
}

/**
 * Full-screen page: zinc-950 background, safe-area top padding + 16px, 20px side padding,
 * `gap` between children, ScrollView with optional pull-to-refresh and sticky `footer`.
 * Inside the tab navigator the tab bar takes care of the bottom safe area; on pushed screens
 * the bottom inset is added automatically.
 */
export function Screen({ children, gap = 18, onRefresh, refreshing = false, footer, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const inTabs = useContext(BottomTabBarHeightContext) !== undefined;

  const paddingTop = Math.max(insets.top + 16, 24);
  const paddingBottom = 24 + (inTabs || footer ? 0 : insets.bottom);
  const inhoudStijl = {
    paddingTop,
    paddingBottom,
    paddingHorizontal: 20,
    gap,
    width: '100%',
    maxWidth: MAX_BREEDTE,
    alignSelf: 'center',
  } as const;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={[{ flexGrow: 1 }, inhoudStijl]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={kleuren.purple300}
                colors={[kleuren.purple700]}
                progressBackgroundColor={kleuren.zinc900}
                progressViewOffset={insets.top}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1" style={inhoudStijl}>
          {children}
        </View>
      )}

      {footer ? (
        <View
          className="border-t border-zinc-800 bg-zinc-950 px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View style={{ width: '100%', maxWidth: MAX_BREEDTE - 40, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** 28px bold page title for the tab screens ("Evenementen", "Tickets", "Profiel"). */
export function TabTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="text-[28px] font-bold tracking-[-0.5px] text-zinc-50">
      {children}
    </Text>
  );
}

/**
 * `router.back()` when there is history, otherwise `router.replace(fallbackHref)`
 * (e.g. after opening a screen through a deep link). Default fallback: the Evenementen tab.
 */
export function goBack(fallbackHref: Href = '/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref);
  }
}

export interface BackButtonProps {
  onPress?: () => void;
  /** Used when `onPress` is not set and there is no history. Default '/'. */
  fallbackHref?: Href;
  /** Accessibility label. Default "Terug". */
  label?: string;
}

/** 44x44 back button (zinc-900, zinc-800 border, rounded 14, chevron-left zinc-400). */
export function BackButton({ onPress, fallbackHref = '/', label = 'Terug' }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress ?? (() => goBack(fallbackHref))}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-zinc-800 bg-zinc-900 active:opacity-70"
    >
      <Icon name="chevron-left" size={20} color={kleuren.zinc400} />
    </Pressable>
  );
}

export interface ScreenHeaderProps {
  /** 22px bold title. Omit for a header with only the back button (Toevoegen, Betalen). */
  title?: string;
  /** 13px zinc-400 line under the title (dates or the evenement name). */
  subtitle?: string;
  /** Right-aligned slot, e.g. `<StatusPill status="open" />`. */
  right?: ReactNode;
  /** Custom back action. Default: `goBack(fallbackHref)`. */
  onBack?: () => void;
  /** Where back goes when there is no history. Default '/'. */
  fallbackHref?: Href;
  /** Accessibility label of the back button. Default "Terug". */
  backLabel?: string;
  hideBack?: boolean;
}

/** Header row of pushed screens: back button + title/subtitle + optional right slot. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  fallbackHref = '/',
  backLabel = 'Terug',
  hideBack = false,
}: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center gap-3">
      {hideBack ? null : <BackButton onPress={onBack} fallbackHref={fallbackHref} label={backLabel} />}
      <View className="min-w-0 flex-1">
        {title ? (
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            className="text-[22px] font-bold tracking-[-0.3px] text-zinc-50"
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text numberOfLines={1} className="mt-0.5 text-[13px] text-zinc-400">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="shrink-0">{right}</View> : null}
    </View>
  );
}
