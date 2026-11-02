import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * Skeleton loader for messages
 * Muestra un placeholder animado mientras se cargan los mensajes
 */
export const MessageSkeleton = () => (
  <Animated.View entering={FadeIn.duration(300)} className="px-[18px] py-2.5 gap-2">
    <View className="h-3 w-20 rounded bg-slate-700/40" />
    <View className="h-4 w-3/4 rounded bg-slate-700/30" />
  </Animated.View>
);
