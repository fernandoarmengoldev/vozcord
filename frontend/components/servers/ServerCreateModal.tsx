import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Modal from '../common/Modal';
import { ImageIcon } from '../common/Icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, imageUri: string) => Promise<void>;
};

export default function ServerCreateModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setImageUri(null);
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setError('Se necesitan permisos para acceder a la galería');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setError('');

        // Success haptic feedback
        if (Platform.OS !== 'web') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (err: any) {
      setError('Error al seleccionar la imagen');
      console.error('Error picking image:', err);
    }
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();

    // Validation
    if (!trimmedName) {
      setError('El nombre del servidor es requerido');
      return;
    }

    if (trimmedName.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    if (trimmedName.length > 50) {
      setError('El nombre no puede tener más de 50 caracteres');
      return;
    }

    if (!imageUri) {
      setError('La imagen del servidor es requerida');
      return;
    }

    // Haptic feedback on mobile
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setLoading(true);
    setError('');

    try {
      await onCreate(trimmedName, imageUri);

      // Success haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setName('');
      setImageUri(null);
      onClose();
    } catch (err: any) {
      // Error haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setError(err.message || 'Error al crear el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!loading) {
      // Light haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setName('');
      setImageUri(null);
      setError('');
      onClose();
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && name.trim() && imageUri && !loading) {
      handleCreate();
    }
  };

  const isValid = name.trim().length >= 2 && imageUri;

  return (
    <Modal visible={visible} onClose={handleClose} title="Crear Servidor">
      <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
        <View className="items-center mb-2">
          <Pressable
            onPress={handlePickImage}
            disabled={loading}
            className={`h-24 w-24 items-center justify-center rounded-3xl border-2 shadow-lg ${
              imageUri
                ? 'border-indigo-400/60 shadow-indigo-500/30'
                : 'border-dashed border-indigo-400/40 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 shadow-indigo-500/20 active:scale-95'
            }`}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="h-full w-full rounded-3xl"
                resizeMode="cover"
              />
            ) : (
              <View className="items-center gap-1">
                <ImageIcon size={32} color="#a5b4fc" />
                <Text className="text-xs text-indigo-300 font-medium">
                  Tocar
                </Text>
              </View>
            )}
          </Pressable>
          <Text className="mt-3 text-xs text-slate-400 text-center">
            {imageUri ? 'Tocar para cambiar imagen' : 'Seleccionar imagen del servidor'}
          </Text>
        </View>

        {/* Server Name Input */}
        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-300">
            Nombre del Servidor
          </Text>
          <TextInput
            className="w-full rounded-2xl border border-white/15 bg-slate-800/50 px-4 py-3.5 text-white text-base"
            placeholder="Mi servidor increíble"
            placeholderTextColor="rgba(226,232,240,0.4)"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            maxLength={50}
            selectionColor="#60a5fa"
            autoFocus
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-400">
              {name.length}/50 caracteres
            </Text>
            {isValid && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Text className="text-xs text-emerald-400 font-medium">
                  Listo para crear
                </Text>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Helper Text */}
        <View className="rounded-2xl bg-indigo-500/10 border border-indigo-400/20 p-4">
          <Text className="text-xs text-slate-300 leading-5">
            Al crear un servidor, serás el propietario y podrás gestionar canales, miembros y permisos.
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="rounded-2xl bg-red-500/10 border border-red-400/30 p-3"
          >
            <Text className="text-sm text-red-400 text-center font-medium">
              {error}
            </Text>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-2">
          <Pressable
            onPress={handleClose}
            disabled={loading}
            className={`flex-1 rounded-2xl border border-white/15 bg-slate-800/30 py-3.5 ${
              loading ? 'opacity-50' : 'active:bg-slate-800/50'
            }`}
          >
            <Text className="text-center text-base font-semibold text-slate-300">
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCreate}
            disabled={loading || !isValid}
            className={`flex-1 rounded-2xl py-3.5 ${
              loading || !isValid
                ? 'bg-indigo-500/30 opacity-60'
                : 'bg-gradient-to-r from-indigo-500/90 to-purple-500/90 active:from-indigo-600 active:to-purple-600 shadow-lg shadow-indigo-500/30'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">
                Crear Servidor
              </Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
