import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ChevronDownIcon } from '../common/Icons';
import { ChannelItem } from './ChannelItem';
import type { VoiceMemberWithAvatar } from '../../types/main.types';

type Channel = {
  id: number;
  name: string;
  type: 'text' | 'voice';
  categoryId?: number | null;
};

type CategorySectionProps = {
  title: string;
  channels: Channel[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onChannelLongPress?: (channel: Channel) => void;
  voiceMembers?: Map<number, VoiceMemberWithAvatar[]>;
};

export const CategorySection = ({
  title,
  channels,
  selectedId,
  onSelect,
  onChannelLongPress,
  voiceMembers,
}: CategorySectionProps) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withSpring(collapsed ? -90 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [collapsed]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (channels.length === 0) return null;

  return (
    <View className="gap-3">
      <Pressable
        onPress={() => setCollapsed(!collapsed)}
        className="flex-row items-center justify-between"
      >
        <Text className="text-[11px] font-semibold tracking-widest uppercase text-dark-text-tertiary">
          {title}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDownIcon size={14} color="#8a8a99" />
        </Animated.View>
      </Pressable>

      {!collapsed && (
        <View className="gap-2">
          {channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              selected={selectedId === channel.id}
              onPress={() => onSelect(channel.id)}
              onLongPress={() => onChannelLongPress?.(channel)}
              voiceMembers={voiceMembers?.get(channel.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
};
