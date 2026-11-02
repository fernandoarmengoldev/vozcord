import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { UserAvatar } from '../common/UserAvatar';
import { API_URL } from '../../lib/config';

export type User = {
  id: number;
  name: string | null;
  email?: string;
  online?: boolean;
  avatarUrl?: string | null;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MemberItem = ({
  user,
  onPress,
}: {
  user: User;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const label = user.name ?? user.email ?? 'Usuario';
  const isOnline = user.online ?? Math.random() > 0.5;

  const hue = (user.id * 137.508) % 360;
  const fallbackColor = `hsl(${hue}, 70%, 50%)`;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className="flex-row items-center gap-3 px-2.5 py-2.5 rounded-2xl bg-dark-bg-tertiary border border-dark-border-subtle active:bg-dark-bg-hover"
    >

      <UserAvatar
        avatarUrl={user.avatarUrl ? `${API_URL}${user.avatarUrl}` : null}
        size={36}
        borderColor="transparent"
        borderWidth={0}
        fallbackText={label}
        fallbackColor={fallbackColor}
        showOnlineStatus={true}
        isOnline={isOnline}
      />

      <Text className="text-sm text-dark-text-secondary flex-1" numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

export default MemberItem;