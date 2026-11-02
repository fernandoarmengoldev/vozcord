import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type Props = {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export const EmptyMessages = ({
  icon,
  title = 'No hay mensajes todavía',
  subtitle = 'Sé el primero en enviar un mensaje',
}: Props) => (
  <Animated.View
    entering={FadeIn.duration(500)}
    className="flex-1 items-center justify-center py-12"
  >
    <View className="items-center gap-3">
      {icon && (
        <View className="h-16 w-16 items-center justify-center rounded-full bg-dark-bg-elevated">
          {icon}
        </View>
      )}
      <Text className="text-base font-medium text-dark-text-secondary">
        {title}
      </Text>
      <Text className="text-sm text-dark-text-tertiary text-center">
        {subtitle}
      </Text>
    </View>
  </Animated.View>
);
