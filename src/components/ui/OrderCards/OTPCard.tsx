import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OTPCardProps {
  otp: string;
}

export const OTPCard: React.FC<OTPCardProps> = ({ otp }) => {
  // Ensure we have exactly 3 digits (pad or truncate)
  const digits = (otp || '000').padStart(3, '0').slice(0, 3).split('');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Booking Verification</Text>
      <Text style={styles.subtitle}>
        Show this OTP to the store/driver when collecting your order.
      </Text>

      <View style={styles.otpContainer}>
        {digits.map((digit, index) => (
          <View key={index} style={styles.digitBox}>
            <Text style={styles.digitText}>{digit}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footerText}>Share this with the store/driver staff.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 63, 212, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  digitBox: {
    width: 60,
    height: 66,
    backgroundColor: '#F0EBFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 63, 212, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#4A1FA8',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(136, 136, 136, 0.8)',
  },
});
