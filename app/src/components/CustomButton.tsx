import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import CustomText from './CustomText';
import { COLORS } from '../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
}) => {
  // Button container styles
  const getContainerStyle = () => {
    const baseStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 12,
      opacity: disabled ? 0.6 : 1,
    };

    const sizeStyle = {
      sm: { paddingVertical: 8, paddingHorizontal: 16, height: 36 },
      md: { paddingVertical: 12, paddingHorizontal: 24, height: 48 },
      lg: { paddingVertical: 16, paddingHorizontal: 32, height: 56 },
    }[size];

    const variantStyle = {
      primary: {
        backgroundColor: COLORS.logoBackground,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
      secondary: {
        backgroundColor: COLORS.primaryLight,
        borderWidth: 1,
        borderColor: COLORS.primary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#e2e8f0',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      destructive: {
        backgroundColor: COLORS.error,
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }[variant];

    const widthStyle = fullWidth ? { width: '100%' as const } : {};

    return [baseStyle, sizeStyle, variantStyle, widthStyle];
  };

  // Text styles
  const getTextStyle = () => {
    const baseStyle = {
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    };

    const sizeStyle = {
      sm: { fontSize: 14 },
      md: { fontSize: 16 },
      lg: { fontSize: 18 },
    }[size];

    const variantStyle = {
      primary: { color: '#FFFFFF' },
      secondary: { color: COLORS.primary },
      outline: { color: '#374151' },
      ghost: { color: COLORS.primary },
      destructive: { color: '#FFFFFF' },
    }[variant];

    return [baseStyle, sizeStyle, variantStyle];
  };

  const getSpinnerColor = () => {
    return {
      primary: '#FFFFFF',
      secondary: COLORS.primary,
      outline: '#374151',
      ghost: COLORS.primary,
      destructive: '#FFFFFF',
    }[variant];
  };

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <>
          {leftIcon && <View style={styles.iconSpacing}>{leftIcon}</View>}
          <CustomText style={getTextStyle()}>{title}</CustomText>
          {rightIcon && <View style={styles.iconSpacing}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconSpacing: {
    marginHorizontal: 8,
  },
});

export default CustomButton;