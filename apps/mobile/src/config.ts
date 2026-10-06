const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || 'https://apibackend.agendaki.net/api/v1').replace(
  /\/$/,
  '',
);
// Palette matched to the supplied AgendAKI mobile storyboard and original logo.
export const BRAND = {
  forest: '#002416',
  forestSoft: '#00851b',
  green: '#00b52a',
  greenBright: '#38f335',
  greenPale: '#eafaf2',
  greenSoft: '#d8f7e5',
  ink: '#101426',
  muted: '#52658b',
  line: '#e6ecf3',
  canvas: '#ffffff',
  white: '#ffffff',
  blue: '#2878ff',
  bluePale: '#eaf3ff',
  amber: '#ef8b16',
  red: '#f04444',
  redPale: '#fff1f2',
  purple: '#7775ff',
  purpleInk: '#6535e8',
  purplePale: '#f2eeff',
} as const;
