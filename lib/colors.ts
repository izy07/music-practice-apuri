// Color utilities (contrast/readability)

// Relative luminance per WCAG
const srgbToLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r / 255);
  const G = srgbToLinear(g / 255);
  const B = srgbToLinear(b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

export const contrastRatio = (hex1: string, hex2: string): number => {
  const L1 = luminance(hex1);
  const L2 = luminance(hex2);
  const [lighter, darker] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
};

export const ensureContrast = (fg: string, bg: string, min: number = 4.5): string => {
  if (contrastRatio(fg, bg) >= min) return fg;
  // if insufficient, choose black or white whichever passes
  const black = '#000000';
  const white = '#FFFFFF';
  return contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
};

export const readableTextColor = (bg: string) => ensureContrast('#000000', bg);

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}


