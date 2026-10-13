import { create } from 'qrcode';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { kleuren } from './kleuren';

/** Quiet zone around the code, in modules (the QR spec asks for 4; 2 scans fine on a white card). */
const MARGE = 2;

export interface QrCodeProps {
  /** Text to encode, e.g. an uitnodigingslink. */
  value: string;
  /** Width and height in px. Default 220. */
  size?: number;
}

/** Path with one 1x1 square per dark module, offset by the quiet zone. */
function modulePad(value: string): { pad: string; zijde: number } {
  const { modules } = create(value, { errorCorrectionLevel: 'M' });
  let pad = '';
  for (let rij = 0; rij < modules.size; rij++) {
    for (let kolom = 0; kolom < modules.size; kolom++) {
      if (modules.data[rij * modules.size + kolom]) pad += `M${kolom + MARGE} ${rij + MARGE}h1v1h-1z`;
    }
  }
  return { pad, zijde: modules.size + MARGE * 2 };
}

/** QR code drawn with react-native-svg (zinc-950 on white), works on iOS, Android and web. */
export function QrCode({ value, size = 220 }: QrCodeProps) {
  const { pad, zijde } = modulePad(value);
  return (
    <View accessibilityRole="image" accessibilityLabel="QR-code" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${zijde} ${zijde}`}>
        <Rect width={zijde} height={zijde} fill="#ffffff" />
        <Path d={pad} fill={kleuren.zinc950} />
      </Svg>
    </View>
  );
}
