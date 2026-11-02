import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SendIcon } from '../common/Icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  input: string;
  setInput: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export const MessageComposer = ({
  input,
  setInput,
  onSend,
  disabled = false,
  placeholder = 'Escribe un mensaje...',
}: Props) => {
  const scale = useSharedValue(1);

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSendPress = () => {
    if (disabled) return;
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    onSend();
  };

  return (
    <View className="border-t border-dark-border-default p-3.5 bg-dark-bg-secondary">
      <View className="flex-row items-center gap-3">
        {/* Input container */}
        <View className="flex-1 border border-dark-border-default bg-dark-bg-elevated px-4 py-2.5 rounded-xl">
          <TextInput
            className="flex-1 text-base text-dark-text-primary placeholder:text-dark-text-muted"
            placeholder={placeholder}
            placeholderTextColor="#6a6a77"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
        </View>

        {/* Send button */}
        <AnimatedPressable
          onPress={handleSendPress}
          disabled={disabled}
          style={sendButtonStyle}
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            disabled ? 'bg-dark-bg-elevated' : 'bg-dark-accent-blue active:bg-dark-accent-blue-dark'
          }`}
        >
          <SendIcon size={18} color="#e8e8ed" />
        </AnimatedPressable>
      </View>
    </View>
  );
};
