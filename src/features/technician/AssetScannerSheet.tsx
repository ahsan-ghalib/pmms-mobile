import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { technicianCopy } from './technicianCopy';

const BARCODE_TYPES = [
  'qr',
  'code128',
  'code39',
  'code93',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'itf14',
  'datamatrix',
] as const;

const RETRY_SAME_CODE_MS = 2500;

type Props = {
  visible: boolean;
  pending: boolean;
  error?: string | null;
  onScanned: (code: string) => void;
  onManual: () => void;
  onClose: () => void;
};

export default function AssetScannerSheet({
  visible,
  pending,
  error,
  onScanned,
  onManual,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { language, font, row } = useLanguage();
  const copy = technicianCopy[language].detail;
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const locked = useRef(false);
  const last = useRef<{ code: string; at: number } | null>(null);
  const frame = Math.min(width * 0.7, 280);

  useEffect(() => {
    if (!pending) locked.current = false;
  }, [pending]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleScan = ({ data }: BarcodeScanningResult) => {
    const code = data?.trim();
    if (!code || locked.current || pending) return;
    const now = Date.now();
    if (last.current && last.current.code === code && now - last.current.at < RETRY_SAME_CODE_MS) {
      return;
    }
    locked.current = true;
    last.current = { code, at: now };
    Vibration.vibrate(40);
    onScanned(code);
  };

  const granted = Boolean(permission?.granted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        {granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={visible ? handleScan : undefined}
          />
        ) : null}

        <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
          {granted ? (
            <>
              <View
                style={{ width: frame, height: frame }}
                className="items-center justify-center rounded-3xl border-2 border-white/90"
              >
                {pending ? (
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-black/60">
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : null}
              </View>
              <Text
                className={`mt-6 px-10 text-center text-[14px] leading-5 ${font.medium} text-white`}
              >
                {pending ? copy.scanChecking : copy.scanHint}
              </Text>
              {error && !pending ? (
                <View
                  className={`mx-8 mt-3 ${row} items-center gap-2 rounded-xl bg-rose-500/90 px-3.5 py-2.5`}
                >
                  <Ionicons name="alert-circle" size={16} color="#fff" />
                  <Text className={`shrink text-[13px] ${font.medium} text-white`}>{error}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View className="items-center px-10">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
                <Ionicons name="camera-outline" size={30} color="#fff" />
              </View>
              <Text className={`mt-4 text-center text-[16px] ${font.semibold} text-white`}>
                {copy.cameraNeeded}
              </Text>
              <Pressable
                onPress={() =>
                  permission?.canAskAgain === false ? Linking.openSettings() : requestPermission()
                }
                className="mt-5 rounded-full bg-brand-500 px-5 py-3"
              >
                <Text className={`text-[14px] ${font.semibold} text-white`}>
                  {permission?.canAskAgain === false ? copy.openSettings : copy.allowCamera}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View
          className={`absolute left-0 right-0 ${row} items-center justify-between px-5`}
          style={{ top: insets.top + 10 }}
        >
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/50"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text className={`text-[17px] ${font.bold} text-white`}>{copy.assetTitle}</Text>
          <Pressable
            onPress={() => setTorch((value) => !value)}
            disabled={!granted}
            className={`h-11 w-11 items-center justify-center rounded-full ${torch ? 'bg-amber-400' : 'bg-black/50'}`}
          >
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={20} color="#fff" />
          </Pressable>
        </View>

        <View className="absolute left-0 right-0 px-5" style={{ bottom: insets.bottom + 20 }}>
          <Pressable
            onPress={onManual}
            className={`h-[52px] ${row} items-center justify-center gap-2 rounded-2xl bg-white/15 active:bg-white/25`}
          >
            <Ionicons name="keypad-outline" size={19} color="#fff" />
            <Text className={`text-[15px] ${font.semibold} text-white`}>{copy.enterManually}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
