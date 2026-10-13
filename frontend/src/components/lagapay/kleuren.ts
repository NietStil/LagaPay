// Hex values of the Tailwind colors used in the design, for props that don't take a
// className (Icon color, ActivityIndicator, RefreshControl, navigation theme, ...).
// In className use the Tailwind names (bg-zinc-950, text-purple-300, ...).

export const kleuren = {
  zinc950: '#09090b',
  zinc900: '#18181b',
  zinc800: '#27272a',
  zinc700: '#3f3f46',
  zinc500: '#71717a',
  zinc400: '#a1a1aa',
  zinc300: '#d4d4d8',
  zinc50: '#fafafa',
  /** Off-palette grey: closed evenement cards. Class: bg-[#111113] */
  grijsGesloten: '#111113',
  /** Off-palette grey: scan area, dashed empty slots, ticket footer strip. Class: bg-[#131316] */
  grijsVlak: '#131316',
  purple950: '#3b0764',
  purple800: '#6b21a8',
  purple700: '#7e22ce',
  purple300: '#d8b4fe',
  purple200: '#e9d5ff',
  purple100: '#f3e8ff',
  emerald950: '#022c22',
  emerald800: '#065f46',
  emerald400: '#34d399',
  emerald300: '#6ee7b7',
  rose400: '#fb7185',
  rose300: '#fda4af',
  white: '#ffffff',
} as const;
