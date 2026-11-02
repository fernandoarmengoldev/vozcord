import { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { DiscordIcon } from './Icons';

type UserAvatarProps = {
  avatarUrl?: string | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  fallbackText?: string;
  fallbackColor?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
};

export const UserAvatar = ({
  avatarUrl,
  size = 40,
  borderColor = '#fff',
  borderWidth = 2,
  fallbackText,
  fallbackColor,
  showOnlineStatus = false,
  isOnline = false,
}: UserAvatarProps) => {
  const containerSize = size;
  const imageSize = size - (borderWidth * 2);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const initials = fallbackText
    ? fallbackText.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  const shouldShowImage = avatarUrl && !imageError;

  return (
    <View className="relative">
      <View
        className="rounded-full items-center justify-center bg-slate-700/50"
        style={{
          width: containerSize,
          height: containerSize,
          borderWidth,
          borderColor,
        }}
      >
        {shouldShowImage ? (
          <>
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: imageSize / 2,
              }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View
                className="absolute inset-0 items-center justify-center bg-slate-700/50 rounded-full"
                style={{
                  width: imageSize,
                  height: imageSize,
                }}
              >
                <ActivityIndicator size="small" color="#94a3b8" />
              </View>
            )}
          </>
        ) : initials ? (
          <View
            className="rounded-full items-center justify-center"
            style={{
              width: imageSize,
              height: imageSize,
              backgroundColor: fallbackColor || '#60a5fa',
            }}
          >
            <Text
              className="text-white font-semibold"
              style={{ fontSize: size * 0.35 }}
            >
              {initials}
            </Text>
          </View>
        ) : (
          <DiscordIcon size={size * 0.55} color="#94a3b8" />
        )}
      </View>

      {showOnlineStatus && (
        <View
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 ${
            isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`}
          style={{
            width: size * 0.3,
            height: size * 0.3,
            borderColor: borderColor,
          }}
        />
      )}
    </View>
  );
};
