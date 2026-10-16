import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import SarIcon from './SarIcon';

type MoneyAmountProps = {
  amount: string | number;
  size?: number;
  color?: string;
  iconColor?: string;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  /** Decimals when amount is a number (default 2). Pass null to skip formatting. */
  decimals?: number | null;
};

/**
 * Riyal icon then amount in every language: [icon] 12.50
 * Forces LTR so RTL parents don't flip the row.
 */
export default function MoneyAmount({
  amount,
  size = 12,
  color = '#0F172A',
  iconColor,
  textStyle,
  style,
  decimals = 2,
}: MoneyAmountProps) {
  const value =
    typeof amount === 'number'
      ? decimals == null
        ? String(amount)
        : amount.toFixed(decimals)
      : String(amount);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          direction: 'ltr',
        },
        style,
      ]}
    >
      <SarIcon size={size} color={iconColor ?? color} />
      <Text style={[{ color, fontWeight: '700' }, textStyle]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
