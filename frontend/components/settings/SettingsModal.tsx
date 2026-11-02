import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal as RNModal, Platform, Alert, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { CloseIcon, LogoutIcon } from '../common/Icons';
import { UserAvatar } from '../common/UserAvatar';
import { useUserProfile } from '../../lib/useUserProfile';
import { API_URL } from '../../lib/config';

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export default function SettingsModal({ visible, onClose, onLogout }: Props) {
  const { userProfile, uploadAvatar, loading: profileLoading } = useUserProfile();
  const [uploading, setUploading] = useState(false);

  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const logoutButtonScale = useSharedValue(1);
  const avatarButtonScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
      });
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, {
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const logoutButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoutButtonScale.value }],
  }));

  const avatarButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarButtonScale.value }],
  }));

  const handleAvatarChange = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitas dar permiso para acceder a tus fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setUploading(true);

      const asset = result.assets[0];
      if (!asset) {
        throw new Error('No asset selected');
      }

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

      await uploadAvatar(file);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'No se pudo subir la imagen. Inténtalo de nuevo.');

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    avatarButtonScale.value = withTiming(0.95, { duration: 100 });
    setTimeout(() => {
      avatarButtonScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, 100);

    handleAvatarChange();
  };

  const handleLogoutPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    logoutButtonScale.value = withTiming(0.95, { duration: 100 });
    setTimeout(() => {
      logoutButtonScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, 100);

    setTimeout(onLogout, 150);
  };

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <RNModal
      transparent
      visible={visible}
      onRequestClose={handleClose}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[{ flex: 1 }, backdropStyle]}>
        <Pressable onPress={handleClose} className="flex-1 bg-black/70">
          <View className="flex-1 items-center justify-center p-6">
            <Animated.View style={[{ width: '100%', maxWidth: 400 }, modalStyle]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <BlurView
                  intensity={80}
                  tint="dark"
                  className="rounded-3xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-2xl shadow-black/60"
                >
                  <View className="flex-row items-center justify-between px-6 py-5 border-b border-white/10">
                    <Text className="text-xl font-bold text-white">Configuración</Text>
                    <Pressable
                      onPress={handleClose}
                      className="h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/20 active:bg-white/20"
                    >
                      <CloseIcon size={18} color="#e2e8f0" />
                    </Pressable>
                  </View>

                  <View className="px-6 py-6">
                    <View className="items-center mb-6">
                      <View className="relative">
                        <UserAvatar
                          avatarUrl={userProfile?.avatarUrl ? `${API_URL}${userProfile.avatarUrl}` : null}
                          size={100}
                          borderColor="#6366f1"
                          borderWidth={3}
                        />
                        {uploading && (
                          <View className="absolute inset-0 items-center justify-center bg-black/50 rounded-full">
                            <ActivityIndicator size="large" color="#6366f1" />
                          </View>
                        )}
                      </View>
                      <Text className="text-white font-bold text-lg mt-4">
                        {userProfile?.name || userProfile?.email || 'Usuario'}
                      </Text>
                      <Text className="text-gray-400 text-sm">
                        {userProfile?.email}
                      </Text>

                      <Animated.View style={avatarButtonAnimatedStyle} className="mt-4 w-full">
                        <Pressable
                          onPress={handleAvatarPress}
                          disabled={uploading}
                          className="flex-row items-center justify-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 active:bg-indigo-500/20"
                        >
                          <Text className="text-indigo-400 font-semibold text-sm">
                            {uploading ? 'Subiendo...' : 'Cambiar Avatar'}
                          </Text>
                        </Pressable>
                      </Animated.View>
                    </View>

                    <Animated.View style={logoutButtonAnimatedStyle}>
                      <Pressable
                        onPress={handleLogoutPress}
                        className="flex-row items-center p-4 rounded-2xl bg-red-500/10 border border-red-500/30 active:bg-red-500/20"
                      >
                        <View className="w-10 h-10 items-center justify-center rounded-full bg-red-500/20 mr-4">
                          <LogoutIcon size={20} color="#ef4444" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-base">
                            Cerrar Sesión
                          </Text>
                          <Text className="text-gray-400 text-sm mt-0.5">
                            Salir de tu cuenta
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  </View>
                </BlurView>
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>
    </RNModal>
  );
}
