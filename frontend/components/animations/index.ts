import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Pressable } from 'react-native';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Custom hook that provides independent animation values and handlers for each component instance.
 * This ensures that pressing one item doesn't animate all items.
 *
 * @returns Object containing animatedStyle and press handlers with isolated animation state
 */
export const usePressAnimation = () => {
    // Each component instance gets its own independent animation values
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
        opacity.value = withTiming(0.85, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 150 });
    };

    return {
        animatedStyle,
        handlePressIn,
        handlePressOut,
    };
};