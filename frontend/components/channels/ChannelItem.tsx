import { View, Text } from 'react-native';
import { TextChannelIcon, VoiceChannelIcon } from '../common/Icons';
import { AnimatedPressable, usePressAnimation } from '../animations';
import { UserAvatar } from '../common/UserAvatar';
import { API_URL } from '../../lib/config';
import type { VoiceMemberWithAvatar } from '../../types/main.types';

type Channel = {
  id: number;
  name: string;
  type: 'text' | 'voice';
  categoryId?: number | null;
};

type ChannelItemProps = {
  channel: Channel;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  voiceMembers?: VoiceMemberWithAvatar[];
};

export const ChannelItem = ({
  channel,
  selected,
  onPress,
  onLongPress,
  voiceMembers,
}: ChannelItemProps) => {
  // Each ChannelItem instance gets its own independent animation state
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const Icon = channel.type === 'text' ? TextChannelIcon : VoiceChannelIcon;
  const iconColor = selected ? '#e8e8ed' : '#8a8a99';

  return (
    <View>
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        className={`flex-row items-center gap-2 rounded-2xl px-4 py-2.5 border ${selected
          ? 'bg-dark-accent-purple/30 border-dark-accent-purple-light/55'
          : 'bg-dark-bg-tertiary border-dark-border-subtle'
          }`}
      >
        <Icon size={16} color={iconColor} />
        <Text
          className={`text-sm flex-1 ${selected ? 'text-dark-text-primary font-semibold' : 'text-dark-text-secondary'
            }`}
          numberOfLines={1}
        >
          {channel.name}
        </Text>
      </AnimatedPressable>

      {channel.type === 'voice' && voiceMembers && voiceMembers.length > 0 && (
        <View className="mt-1 ml-2 gap-1">
          {voiceMembers.map((member) => {
            const memberName = member.name || `Usuario ${member.userId}`;
            const memberId = parseInt(member.userId, 10);
            const hue = (memberId * 137.508) % 360;
            const fallbackColor = `hsl(${hue}, 70%, 50%)`;
            const avatarUrl = member.avatarUrl ? `${API_URL}${member.avatarUrl}` : null;

            return (
              <View key={member.peerId} className="flex-row items-center gap-2 px-2 py-1">
                <UserAvatar
                  avatarUrl={avatarUrl}
                  size={24}
                  borderColor="transparent"
                  borderWidth={0}
                  fallbackText={memberName}
                  fallbackColor={fallbackColor}
                  showOnlineStatus={true}
                  isOnline={true}
                />
                <Text className="text-xs text-dark-text-tertiary">{memberName}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
