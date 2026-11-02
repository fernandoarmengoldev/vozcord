import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Modal from '../common/Modal';
import { TextChannelIcon, VoiceChannelIcon, CheckIcon } from '../common/Icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, type: 'text' | 'voice') => Promise<void>;
};

export default function ChannelCreateModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre del canal es requerido');
      return;
    }

    if (trimmedName.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreate(trimmedName, type);
      setName('');
      setType('text');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear el canal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setType('text');
      setError('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Crear Canal">
      <Animated.View entering={FadeInDown.duration(100)} className="gap-5">
        <View className="gap-2">
          <Text className="text-sm font-medium text-dark-text-secondary">Nombre del Canal</Text>
          <TextInput
            className="w-full rounded-2xl border border-dark-border-default bg-dark-bg-elevated px-4 py-3 text-dark-text-primary text-base"
            placeholder="general"
            placeholderTextColor="rgba(138,138,153,0.5)"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            maxLength={50}
            selectionColor="#60a5fa"
          />
          <Text className="text-xs text-dark-text-tertiary">
            {name.length}/50 caracteres
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-dark-text-secondary">Tipo de Canal</Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => !loading && setType('text')}
              disabled={loading}
              className={`flex-1 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 ${type === 'text'
                  ? 'bg-dark-accent-purple/30 border-dark-accent-purple-light/60'
                  : 'bg-dark-bg-elevated border-dark-border-default'
                }`}
            >
              <TextChannelIcon size={20} color={type === 'text' ? '#a5b4fc' : '#8a8a99'} />
              <View className="flex-1">
                <Text
                  className={`text-sm font-medium ${type === 'text' ? 'text-dark-text-primary' : 'text-dark-text-secondary'
                    }`}
                >
                  Texto
                </Text>
                <Text className="text-xs text-dark-text-tertiary">Enviar mensajes</Text>
              </View>
              {type === 'text' && <CheckIcon size={18} color="#a5b4fc" />}
            </Pressable>

            <Pressable
              onPress={() => !loading && setType('voice')}
              disabled={loading}
              className={`flex-1 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 ${type === 'voice'
                  ? 'bg-dark-accent-purple/30 border-dark-accent-purple-light/60'
                  : 'bg-dark-bg-elevated border-dark-border-default'
                }`}
            >
              <VoiceChannelIcon size={20} color={type === 'voice' ? '#a5b4fc' : '#8a8a99'} />
              <View className="flex-1">
                <Text
                  className={`text-sm font-medium ${type === 'voice' ? 'text-dark-text-primary' : 'text-dark-text-secondary'
                    }`}
                >
                  Voz
                </Text>
                <Text className="text-xs text-dark-text-tertiary">Unirse por voz</Text>
              </View>
              {type === 'voice' && <CheckIcon size={18} color="#a5b4fc" />}
            </Pressable>
          </View>
        </View>

        {error && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Text className="text-sm text-red-400 text-center">{error}</Text>
          </Animated.View>
        )}

        <View className="flex-row gap-3 mt-2">
          <Pressable
            onPress={handleClose}
            disabled={loading}
            className="flex-1 rounded-2xl border border-dark-border-default bg-dark-bg-elevated py-3 active:bg-dark-bg-hover"
          >
            <Text className="text-center text-base font-semibold text-dark-text-secondary">
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCreate}
            disabled={loading || !name.trim()}
            className={`flex-1 rounded-2xl py-3 ${loading || !name.trim()
                ? 'bg-dark-accent-purple/30'
                : 'bg-dark-accent-purple active:bg-dark-accent-purple-dark'
              }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">Crear</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
