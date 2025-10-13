// src/constants/typography.ts
import { COLORS } from './colors';

export const TYPOGRAPHY = {
  fonts: {
    light: 'Roboto-Light',
    regular: 'Roboto-Regular',
    medium: 'Roboto-Medium',
    bold: 'Roboto-Bold',
    semibold: 'Roboto-SemiBold',
    extrabold: 'Roboto-ExtraBold',
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  variants: {
    // Preset styles using COLORS
    display: { 
      fontFamily: 'Roboto-Bold', 
      fontSize: 34, 
      color: COLORS.dark 
    },
    heading: { 
      fontFamily: 'Roboto-Bold', 
      fontSize: 26, 
      color: COLORS.dark 
    },
    subheading: { 
      fontFamily: 'Roboto-SemiBold', 
      fontSize: 20, 
      color: COLORS.gray 
    },
    body: { 
      fontFamily: 'Roboto-Regular', 
      fontSize: 16, 
      color: COLORS.gray 
    },
    bodyMedium: { 
      fontFamily: 'Roboto-Medium', 
      fontSize: 16, 
      color: COLORS.dark 
    },
    caption: { 
      fontFamily: 'Roboto-Light', 
      fontSize: 14, 
      color: COLORS.light 
    },
    button: { 
      fontFamily: 'Roboto-Medium', 
      fontSize: 16, 
      color: COLORS.white 
    },
    
    // Semantic variants
    success: { 
      fontFamily: 'Roboto-Medium', 
      fontSize: 14, 
      color: COLORS.success 
    },
    error: { 
      fontFamily: 'Roboto-Medium', 
      fontSize: 14, 
      color: COLORS.error 
    },
    warning: { 
      fontFamily: 'Roboto-Medium', 
      fontSize: 14, 
      color: COLORS.warning 
    },
    
    // Brand variants
    brandPrimary: {
      fontFamily: 'Roboto-Medium',
      fontSize: 16,
      color: COLORS.primary
    },
    brandAccent: {
      fontFamily: 'Roboto-SemiBold',
      fontSize: 18,
      color: COLORS.brandPurple
    },
  },
} as const;