import { useState } from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { API_URL } from '../../lib/config';

export type Server = { id: number; name: string; icon?: string | null };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  server: Server;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

const ServerButton = ({ server, selected, onPress, onLongPress }: Props) => {
  const scale = useSharedValue(1);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const iconUrl = server.icon ? `${API_URL}${server.icon}` : null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className={`h-14 w-14 rounded-[22px] items-center justify-center border overflow-hidden ${selected ? 'bg-dark-accent-blue/52 border-dark-accent-blue-light/80' : 'bg-dark-bg-elevated border-dark-border-subtle'
        }`}
    >
      <>
        <Image
          source={iconUrl ? { uri: iconUrl } : null}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => setImageLoading(false)}
        />
      </>
    </AnimatedPressable>
  );
};

export default ServerButton;