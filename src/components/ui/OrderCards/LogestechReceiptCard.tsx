import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LogestechReceiptCardProps {
  isDownloading?: boolean;
  onDownload: () => void;
}

export const LogestechReceiptCard: React.FC<LogestechReceiptCardProps> = ({
  isDownloading = false,
  onDownload,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Shipping Label</Text>

      <View style={styles.infoContainer}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="package-variant-closed" size={24} color="#6C3FD4" />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.infoTitle}>Logestech Receipt</Text>
          <Text style={styles.infoDesc}>
            Download or print the shipping label to attach to the parcel.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isDownloading && styles.buttonDisabled]}
        onPress={onDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="printer" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Print Shipping Label</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 63, 212, 0.15)',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#F0EBFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  infoDesc: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#6C3FD4',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
