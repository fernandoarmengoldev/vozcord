import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { UserAvatar } from '../common/UserAvatar';
import { API_URL } from '../../lib/config';

export type Message = {
  id: number;
  content: string;
  createdAt: string;
  userId?: number;
  senderId?: number;
  author?: string | null;
  authorAvatarUrl?: string | null;
};

type Props = {
  message: Message;
  index: number;
};

export const MessageItem = ({ message, index }: Props) => {
  const authorName = message.author ?? 'Usuario';
  const authorId = message.userId ?? message.senderId ?? 0;

  // Generate consistent color for avatar fallback
  const hue = (authorId * 137.508) % 360;
  const fallbackColor = `hsl(${hue}, 70%, 50%)`;

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(300)}
      className="px-[18px] py-2.5"
    >
      <View className="flex-row gap-3">
        <UserAvatar
          avatarUrl={message.authorAvatarUrl ? `${API_URL}${message.authorAvatarUrl}` : null}
          size={36}
          borderColor="transparent"
          borderWidth={0}
          fallbackText={authorName}
          fallbackColor={fallbackColor}
        />
        <View className="flex-1 gap-1">
          <Text className="text-xs text-dark-text-tertiary">{authorName}</Text>
          <Text className="text-sm text-dark-text-primary">{message.content}</Text>
        </View>
      </View>
    </Animated.View>
  );
};
