export const palette = {
  primary: '#ee4d2d',
  primaryDark: '#d83a1b',
  secondary: '#ff6b4a',
  accent: '#ffd089',
  success: '#37b26c',
  info: '#3d7bff',
  warning: '#f2a33c',
  danger: '#ff4d4d',
  neutral100: '#ffffff',
  neutral200: '#f8f9fb',
  neutral300: '#edf0f5',
  neutral400: '#d7dce5',
  neutral500: '#a0a7b7',
  neutral600: '#5f6675',
  neutral700: '#2d3141',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const gradients = {
  primary: ['#ee4d2d', '#ff784f'],
  secondary: ['#ff9770', '#ffa947'],
  glass: ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.1)'],
};

export const shadows = {
  soft: {
    shadowColor: 'rgba(238, 77, 45, 0.35)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  card: {
    shadowColor: 'rgba(26, 26, 26, 0.08)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 8,
  },
  floating: {
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
};

export const typography = {
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.neutral100,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.neutral700,
  },
};

