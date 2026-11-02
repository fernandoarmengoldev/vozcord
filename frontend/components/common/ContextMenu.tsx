import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

export type ContextMenuItem = {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
  title?: string;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Context menu for long-press actions with smooth animations
 */
export default function ContextMenu({ visible, onClose, items, title }: Props) {
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 350,
      });
      scale.value = withSpring(1, {
        damping: 18,
        stiffness: 250,
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(100, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 150 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const handleItemPress = (item: ContextMenuItem) => {
    onClose();
    // Delay execution slightly to allow animation to complete
    setTimeout(() => item.onPress(), 100);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[{ flex: 1 }, backdropStyle]}>
        <Pressable onPress={onClose} className="flex-1 bg-black/70">
          <View className="flex-1 items-center justify-end pb-8 px-4">
            <Animated.View style={[{ width: '100%', maxWidth: 400 }, menuStyle]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <BlurView
                  intensity={90}
                  tint="dark"
                  className="rounded-3xl border border-dark-border-default bg-dark-bg-secondary/95 overflow-hidden shadow-2xl shadow-black/60"
                >
                  {/* Title */}
                  {title && (
                    <View className="px-5 py-3.5 border-b border-dark-border-default">
                      <Text className="text-sm font-semibold text-dark-text-secondary text-center">
                        {title}
                      </Text>
                    </View>
                  )}

                  {/* Menu Items */}
                  <View className="py-2">
                    {items.map((item, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleItemPress(item)}
                        className="flex-row items-center gap-3 px-5 py-3.5 active:bg-dark-bg-hover"
                      >
                        {item.icon && <View>{item.icon}</View>}
                        <Text
                          className={`text-base flex-1 ${
                            item.danger ? 'text-red-400' : 'text-dark-text-primary'
                          }`}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </BlurView>

                {/* Cancel Button */}
                <Pressable
                  onPress={onClose}
                  className="mt-3 rounded-3xl border border-dark-border-default bg-dark-bg-secondary/95 py-4 active:bg-dark-bg-elevated"
                >
                  <BlurView intensity={90} tint="dark" className="absolute inset-0 rounded-3xl" />
                  <Text className="text-base font-semibold text-dark-text-primary text-center">
                    Cancelar
                  </Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
