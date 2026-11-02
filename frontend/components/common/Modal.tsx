import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal as RNModal, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CloseIcon } from './Icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Glassmorphism modal with smooth animations
 */
export default function Modal({ visible, onClose, title, children, maxWidth = 500 }: Props) {
  const backdropOpacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      // Animate in
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
      });
    } else {
      // Animate out
      backdropOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <RNModal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[{ flex: 1 }, backdropStyle]}>
        <Pressable onPress={onClose} className="flex-1 bg-black/60">
          <View className="flex-1 items-center justify-center p-4">
            {/* Modal Container */}
            <Animated.View
              style={[{ maxWidth, width: '100%' }, modalStyle]}
              className="w-full"
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <BlurView
                  intensity={80}
                  tint="dark"
                  className="rounded-3xl border border-dark-border-default bg-dark-bg-secondary/95 overflow-hidden shadow-2xl shadow-black/60"
                >
                  {/* Header */}
                  {title && (
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-dark-border-default">
                      <Text className="text-lg font-semibold text-dark-text-primary">{title}</Text>
                      <Pressable
                        onPress={onClose}
                        className="h-8 w-8 items-center justify-center rounded-full bg-dark-bg-elevated active:bg-dark-bg-hover"
                      >
                        <CloseIcon size={18} color="#e8e8ed" />
                      </Pressable>
                    </View>
                  )}

                  {/* Content */}
                  <View className="p-6">{children}</View>
                </BlurView>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </RNModal>
  );
}
