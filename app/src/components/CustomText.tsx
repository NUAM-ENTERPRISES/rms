// src/components/CustomText.tsx
import React from 'react';
import { Text, TextProps } from 'react-native';
import { TYPOGRAPHY } from '../constants/typography';
import { COLORS } from '../constants/colors';

type ColorKey = keyof typeof COLORS;

interface CustomTextProps extends TextProps {
    variant?: keyof typeof TYPOGRAPHY['fonts'];
    size?: keyof typeof TYPOGRAPHY['sizes'] | number;
    preset?: keyof typeof TYPOGRAPHY['variants'];
    color?: ColorKey | string;
}

const CustomText = ({
    variant = 'regular',
    size,
    preset,
    color,
    style,
    ...props
}: CustomTextProps) => {
    const textStyle = preset
        ? TYPOGRAPHY.variants[preset]
        : {
            fontFamily: TYPOGRAPHY.fonts[variant],
            fontSize: typeof size === 'string' ? TYPOGRAPHY.sizes[size] : size,
            color: color
                ? (COLORS[color as ColorKey] || color)
                : undefined,
        };

    return (
        <Text style={[textStyle, style]} {...props} />
    );
}

export default CustomText;