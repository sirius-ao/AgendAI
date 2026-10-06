const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || 'https://apibackend.agendaki.net/api/v1').replace(
  /\/$/,
  '',
);
export const BRAND = {
  forest: '#062f24',
  forestSoft: '#0b5239',
  green: '#00bf63',
  greenBright: '#00e676',
  greenPale: '#e8f8ee',
  ink: '#11251d',
  muted: '#64726b',
  line: '#e4ebe7',
  canvas: '#f4f7f5',
  white: '#ffffff',
  blue: '#2677d9',
  amber: '#d98b00',
  red: '#d83b4b',
  purple: '#7556db',
} as const;
