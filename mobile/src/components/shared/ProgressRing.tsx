import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from 'react-native-paper';
import { useThemeContext } from '../../theme/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  displayValue?: string;
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color,
  label,
  displayValue,
}: ProgressRingProps) {
  const { colors } = useThemeContext();
  const resolvedColor = color ?? colors.primary;
  const styles = useThemedStyles((colors) => ({
    container: { alignItems: 'center' },
    textContainer: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
    value: { fontWeight: '700', color: colors.text },
    label: { marginTop: 4, color: colors.textMuted, textAlign: 'center' },
  }));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <View style={[styles.container, { width: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text variant="titleSmall" style={styles.value}>
          {displayValue ?? `${Math.round(clampedValue)}%`}
        </Text>
      </View>
      {label && <Text variant="labelSmall" style={styles.label}>{label}</Text>}
    </View>
  );
}
