import { ComponentProps, useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { homeCopy } from './homeCopy';

export type BannerAction = 'create' | 'emergency' | 'requests';

const SLIDES: {
  action: BannerAction;
  colors: [string, string];
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { action: 'create', colors: ['#1D4ED8', '#3B82F6'], icon: 'snowflake' },
  { action: 'emergency', colors: ['#0F766E', '#14B8A6'], icon: 'lifebuoy' },
  { action: 'requests', colors: ['#6D28D9', '#8B5CF6'], icon: 'map-marker-path' },
];

const GAP = 12;
const AUTO_ADVANCE_MS = 5000;

export default function PromoCarousel({ onAction }: { onAction: (action: BannerAction) => void }) {
  const { width } = useWindowDimensions();
  const { language, isAr, font, row, align } = useLanguage();
  const copy = homeCopy[language];
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const cardWidth = width - 40;
  const step = cardWidth + GAP;

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = (index + 1) % SLIDES.length;
      scrollRef.current?.scrollTo({ x: next * step, animated: true });
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, step]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / step);
    setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}
        onMomentumScrollEnd={onScrollEnd}
      >
        {SLIDES.map((slide, i) => {
          const text = copy.banners[i];
          return (
            <Pressable
              key={slide.action}
              onPress={() => onAction(slide.action)}
              className="active:opacity-95"
              style={{ width: cardWidth }}
            >
              <LinearGradient
                colors={slide.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, overflow: 'hidden', height: 148 }}
              >
                <View
                  className="absolute h-40 w-40 rounded-full bg-white/10"
                  style={[{ top: -50 }, isAr ? { left: -30 } : { right: -30 }]}
                />
                <View
                  className="absolute h-24 w-24 rounded-full bg-white/10"
                  style={[{ bottom: -36 }, isAr ? { left: 70 } : { right: 70 }]}
                />
                <View
                  className="absolute items-center justify-center"
                  style={[{ top: 26 }, isAr ? { left: 22 } : { right: 22 }]}
                >
                  <MaterialCommunityIcons
                    name={slide.icon}
                    size={74}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
                <View
                  className="flex-1 justify-between p-5"
                  style={{ maxWidth: '70%', alignSelf: isAr ? 'flex-end' : 'flex-start' }}
                >
                  <View>
                    <Text
                      className={`text-[11px] uppercase tracking-[1.5px] ${font.bold} text-amber-300 ${align}`}
                    >
                      {text.eyebrow}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className={`mt-1.5 text-[17px] leading-[22px] ${font.bold} text-white ${align}`}
                    >
                      {text.title}
                    </Text>
                  </View>
                  <View
                    className={`${row} items-center gap-1.5 self-start rounded-full bg-white px-3.5 py-2`}
                    style={{ alignSelf: isAr ? 'flex-end' : 'flex-start' }}
                  >
                    <Text className={`text-[12px] ${font.bold}`} style={{ color: slide.colors[0] }}>
                      {text.cta}
                    </Text>
                    <Ionicons
                      name={isAr ? 'arrow-back' : 'arrow-forward'}
                      size={13}
                      color={slide.colors[0]}
                    />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="mt-3 flex-row items-center justify-center gap-1.5">
        {SLIDES.map((slide, i) => (
          <View
            key={slide.action}
            className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-300'}`}
          />
        ))}
      </View>
    </View>
  );
}
