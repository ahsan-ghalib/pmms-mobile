import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function PhotoViewer({
  sources,
  index,
  onClose,
}: {
  sources: ImageSource[];
  index: number | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(0);

  return (
    <Modal
      visible={index !== null}
      animationType="fade"
      onShow={() => setCurrent(index ?? 0)}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: (index ?? 0) * width, y: 0 }}
          onMomentumScrollEnd={(event) =>
            setCurrent(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {sources.map((source, i) => (
            <Image key={i} source={source} contentFit="contain" style={{ width, height }} />
          ))}
        </ScrollView>
        <View
          className="absolute left-0 right-0 flex-row items-center justify-between px-5"
          style={{ top: insets.top + 8 }}
        >
          <Text className="font-inter-semibold text-[14px] text-white">
            {current + 1} / {sources.length}
          </Text>
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
