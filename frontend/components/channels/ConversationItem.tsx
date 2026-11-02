import { View, Text } from 'react-native';
import { AnimatedPressable, usePressAnimation } from '../animations';
import { UserAvatar } from '../common/UserAvatar';
import { API_URL } from '../../lib/config';

type ConversationItemProps = {
  conversation: DirectConversation;
  selected: boolean;
  onPress: () => void;
};

type DirectConversation = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail?: string;
  userAvatarUrl?: string | null;
  lastMessageAt?: string;
};

export const ConversationItem = ({
  conversation,
  selected,
  onPress,
}: ConversationItemProps) => {
  // Each ConversationItem instance gets its own independent animation state
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  // Generate display name from user data
  const displayName = conversation.userName || conversation.userEmail || `Usuario ${conversation.userId}`;

  // Generate a consistent background color based on userId
  const hue = (conversation.userId * 137.508) % 360;
  const fallbackColor = `hsl(${hue}, 70%, 50%)`;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-2.5 border ${selected
          ? 'bg-dark-accent-purple/30 border-dark-accent-purple-light/55'
          : 'bg-dark-bg-tertiary border-dark-border-subtle'
        }`}
    >
      <UserAvatar
        avatarUrl={conversation.userAvatarUrl ? `${API_URL}${conversation.userAvatarUrl}` : null}
        size={36}
        borderColor="transparent"
        borderWidth={0}
        fallbackText={displayName}
        fallbackColor={fallbackColor}
      />
      <View className="flex-1">
        <Text
          className={`text-sm ${selected ? 'text-dark-text-primary font-semibold' : 'text-dark-text-secondary'
            }`}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {conversation.lastMessageAt && (
          <Text className="text-xs text-dark-text-muted mt-0.5" numberOfLines={1}>
            Último mensaje
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
};
