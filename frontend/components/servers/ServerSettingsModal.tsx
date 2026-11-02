import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Modal from '../common/Modal';
import { ImageIcon, SettingsIcon } from '../common/Icons';
import { apiFetch } from '../../lib/api';

type Server = {
  id: number;
  name: string;
  iconUrl: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  server: Server | null;
  onUpdate: () => void;
};

export default function ServerSettingsModal({ visible, onClose, server, onUpdate }: Props) {
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load server data when modal opens
  useEffect(() => {
    if (visible && server) {
      setName(server.name);
      setImageUri(server.iconUrl);
      setError('');
      setLoading(false);
    }
  }, [visible, server]);

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

  const handleUpdate = async () => {
    if (!server) return;

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

    // Check if there are changes
    const nameChanged = trimmedName !== server.name;
    const iconChanged = imageUri !== server.iconUrl;

    if (!nameChanged && !iconChanged) {
      setError('No hay cambios para guardar');
      return;
    }

    // Haptic feedback on mobile
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', trimmedName);

      // Only add icon if it changed and it's a local file (starts with file://)
      if (iconChanged && imageUri && /^(file|blob|data|content):/.test(imageUri)) {
        try {
          const response = await fetch(imageUri);
          if (!response.ok) {
            throw new Error('Error al cargar la imagen');
          }
          const blob = await response.blob();
          formData.append('icon', blob as any, 'icon.jpg');
        } catch (err) {
          console.error('Error fetching image:', err);
          throw new Error('Error al procesar la imagen');
        }
      }

      const res = await apiFetch(`/servers/${server.id}`, {
        method: 'PUT',
        auth: true,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error al actualizar el servidor' }));
        throw new Error(errorData.error || 'Error al actualizar el servidor');
      }

      // Success haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      // Error haptic feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setError(err.message || 'Error al actualizar el servidor');
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

      setError('');
      onClose();
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && name.trim().length >= 2 && !loading) {
      handleUpdate();
    }
  };

  const isValid = name.trim().length >= 2;
  const hasChanges = server && (name.trim() !== server.name || imageUri !== server.iconUrl);

  return (
    <Modal visible={visible} onClose={handleClose} title="Ajustes del Servidor">
      <Animated.View entering={FadeInDown.duration(300)} className="gap-6">
        {/* Server Icon */}
        <View className="items-center mb-2">
          <Pressable
            onPress={handlePickImage}
            disabled={loading}
            className={`h-24 w-24 items-center justify-center rounded-3xl border-2 shadow-lg ${
              imageUri
                ? 'border-blue-400/60 shadow-blue-500/30'
                : 'border-dashed border-blue-400/40 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 shadow-blue-500/20 active:scale-95'
            }`}
          >
            {imageUri && typeof imageUri === 'string' && imageUri.trim() ? (
              <Image
                source={{ uri: imageUri }}
                className="h-full w-full rounded-3xl"
                resizeMode="cover"
                onError={(error) => {
                  console.error('Error loading image:', error);
                  setImageUri(null);
                }}
              />
            ) : (
              <View className="items-center gap-1">
                <ImageIcon size={32} color="#93c5fd" />
                <Text className="text-xs text-blue-300 font-medium">
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
            {hasChanges && isValid && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <Text className="text-xs text-emerald-400 font-medium">
                  Hay cambios para guardar
                </Text>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Helper Text */}
        <View className="rounded-2xl bg-blue-500/10 border border-blue-400/20 p-4">
          <Text className="text-xs text-slate-300 leading-5">
            Modifica el nombre o la imagen del servidor. Los cambios se aplicarán para todos los miembros.
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
            onPress={handleUpdate}
            disabled={loading || !isValid || !hasChanges}
            className={`flex-1 rounded-2xl py-3.5 ${
              loading || !isValid || !hasChanges
                ? 'bg-blue-500/30 opacity-60'
                : 'bg-gradient-to-r from-blue-500/90 to-indigo-500/90 active:from-blue-600 active:to-indigo-600 shadow-lg shadow-blue-500/30'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">
                Guardar Cambios
              </Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
