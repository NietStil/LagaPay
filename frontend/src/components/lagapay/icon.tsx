import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { kleuren } from './kleuren';

interface IconDef {
  /** Stroke width used in the design for this icon. */
  strokeWidth: number;
  node: ReactElement;
}

// SVG data copied from app-design/screens/*.dc.html (24x24 viewBox, stroke icons).
// The last block (share, qr, x, camera, logout) is not in the designs; same stroke style.
const ICONS = {
  'chevron-left': { strokeWidth: 2.2, node: <Path d="M15 19l-7-7 7-7" /> },
  'chevron-right': { strokeWidth: 2.2, node: <Path d="M9 5l7 7-7 7" /> },
  'arrow-up-right': { strokeWidth: 2.4, node: <Path d="M7 17L17 7M8 7h9v9" /> },
  plus: { strokeWidth: 2.4, node: <Path d="M12 5v14M5 12h14" /> },
  minus: { strokeWidth: 2.4, node: <Path d="M5 12h14" /> },
  check: { strokeWidth: 2.6, node: <Path d="M5 13l4 4L19 7" /> },
  /** QR scan corners (Evenement toevoegen). */
  scan: {
    strokeWidth: 2,
    node: <Path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />,
  },
  ticket: {
    strokeWidth: 2,
    node: (
      <Path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    ),
  },
  calendar: {
    strokeWidth: 2,
    node: (
      <>
        <Rect x="3" y="4" width="18" height="18" rx="2" />
        <Path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
  },
  user: {
    strokeWidth: 2,
    node: (
      <>
        <Circle cx="12" cy="8" r="4" />
        <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>
    ),
  },
  /** Phone (Betalen tile). */
  phone: {
    strokeWidth: 2,
    node: (
      <>
        <Rect x="7" y="2" width="10" height="20" rx="2" />
        <Path d="M11 18h2" />
      </>
    ),
  },
  /** Kaart / bankkaart. */
  card: {
    strokeWidth: 2,
    node: (
      <>
        <Rect x="2" y="5" width="20" height="14" rx="2" />
        <Path d="M2 10h20" />
      </>
    ),
  },
  link: {
    strokeWidth: 2,
    node: (
      <Path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
    ),
  },
  /** Circle with exclamation mark (info notes on the kaart screens). */
  info: {
    strokeWidth: 2,
    node: (
      <>
        <Circle cx="12" cy="12" r="9" />
        <Path d="M12 8v4M12 16h.01" />
      </>
    ),
  },
  lock: {
    strokeWidth: 2,
    node: (
      <>
        <Rect x="3" y="11" width="18" height="11" rx="2" />
        <Path d="M7 11V7a5 5 0 0110 0v4" />
      </>
    ),
  },
  /** Contactless waves (Betalen / Kaart koppelen visuals). */
  nfc: {
    strokeWidth: 2,
    node: <Path d="M8.5 8.5a5 5 0 010 7M12 6a9 9 0 010 12M15.5 3.5a13 13 0 010 17" />,
  },

  share: {
    strokeWidth: 2,
    node: <Path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" />,
  },
  qr: {
    strokeWidth: 2,
    node: (
      <>
        <Rect x="3" y="3" width="6" height="6" rx="1" />
        <Rect x="15" y="3" width="6" height="6" rx="1" />
        <Rect x="3" y="15" width="6" height="6" rx="1" />
        <Path d="M15 15h2v2h-2zM19 19h2v2h-2zM15 19h.01M19 15h2M12 3v4M12 11v1M3 12h4M11 12h2M12 15v6" />
      </>
    ),
  },
  x: { strokeWidth: 2.2, node: <Path d="M18 6L6 18M6 6l12 12" /> },
  camera: {
    strokeWidth: 2,
    node: (
      <>
        <Path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z" />
        <Circle cx="12" cy="13" r="3" />
      </>
    ),
  },
  logout: {
    strokeWidth: 2,
    node: <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/** All available icon names. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps {
  name: IconName;
  /** Width and height in px. Default 20. */
  size?: number;
  /** Stroke color (hex or any RN ColorValue). Default zinc-50. */
  color?: ColorValue;
  /** Override the design's stroke width for this icon. */
  strokeWidth?: number;
}

/** Stroke icon from the LagaPay designs, drawn with react-native-svg. */
export function Icon({ name, size = 20, color = kleuren.zinc50, strokeWidth }: IconProps) {
  const icon: IconDef = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth ?? icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon.node}
    </Svg>
  );
}
