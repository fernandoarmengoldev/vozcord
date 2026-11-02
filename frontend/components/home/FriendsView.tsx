import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MemberIcon, SearchIcon, DirectMessagesIcon, AddIcon, BackIcon } from '../common/Icons';
import { UserAvatar } from '../common/UserAvatar';
import UserSearchModal from '../common/UserSearchModal';
import { API_URL } from '../../lib/config';
import type { DirectConversation } from '../channels/ChannelSidebar';

type Props = {
  conversations: DirectConversation[];
  onOpenConversation: (conversationId: number) => void;
  onStartDM: (userId: number) => void | Promise<void>;
  showBack?: boolean;
  onBack?: () => void;
};

/**
 * Pantalla de inicio (estilo "Amigos" de Discord).
 * No hay sistema de solicitudes de amistad en el backend: los "amigos" son las
 * personas con las que tienes una conversación directa. "Añadir amigo" busca un
 * usuario y abre una conversación con él, lo que lo añade a la lista.
 */
export default function FriendsView({ conversations, onOpenConversation, onStartDM, showBack, onBack }: Props) {
  const [query, setQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  const friends = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...conversations].sort((a, b) => displayName(a).localeCompare(displayName(b)));
    if (!q) return list;
    return list.filter(
      (c) => displayName(c).toLowerCase().includes(q) || (c.userEmail ?? '').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const handleSelectUser = async (user: { id: number }) => {
    setSearchVisible(false);
    await onStartDM(user.id);
  };

  return (
    <View className="flex-1 border border-dark-border-subtle bg-dark-bg-tertiary overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-dark-border-default bg-dark-bg-secondary">
        <View className="flex-row items-center gap-3 flex-1">
          {showBack && (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              className="rounded-[14px] px-3 py-2 bg-dark-bg-elevated border border-dark-border-default active:bg-dark-bg-hover"
            >
              <BackIcon size={18} color="#e8e8ed" />
            </Pressable>
          )}
          <MemberIcon size={20} color="#8a8a99" />
          <Text className="text-base font-semibold text-dark-text-primary">Amigos</Text>
        </View>

        <Pressable
          onPress={() => setSearchVisible(true)}
          accessibilityRole="button"
          className="flex-row items-center gap-2 rounded-[14px] px-3.5 py-2 bg-green-600 active:bg-green-700"
        >
          <AddIcon size={14} color="#fff" />
          <Text className="text-[13px] font-semibold text-white">Añadir amigo</Text>
        </Pressable>
      </View>

      {conversations.length === 0 ? (
        // Estado vacío
        <View className="flex-1 items-center justify-center p-6">
          <Animated.View entering={FadeIn.duration(400)} className="items-center gap-4 max-w-sm">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-dark-accent-purple/20">
              <MemberIcon size={48} color="#8b5cf6" />
            </View>
            <Text className="text-lg font-semibold text-dark-text-primary text-center">
              Aún no tienes a nadie por aquí
            </Text>
            <Text className="text-sm text-dark-text-tertiary text-center">
              Busca a alguien por su nombre o email y empieza a hablar.
            </Text>
            <Pressable
              onPress={() => setSearchVisible(true)}
              className="mt-2 rounded-full px-6 py-3 bg-green-600 active:bg-green-700"
            >
              <Text className="text-white font-semibold">Añadir amigo</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        <View className="flex-1 px-5 pt-4">
          {/* Buscador */}
          <View className="flex-row items-center gap-2 rounded-xl px-3 py-2 bg-dark-bg-primary border border-dark-border-subtle">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar"
              placeholderTextColor="#6a6a77"
              className="flex-1 text-sm text-dark-text-primary"
              style={{ outlineStyle: 'none' } as any}
            />
            <SearchIcon size={16} color="#6a6a77" />
          </View>

          <Text className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-dark-text-tertiary">
            Todos — {friends.length}
          </Text>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {friends.length === 0 ? (
              <Text className="py-8 text-center text-sm text-dark-text-tertiary">
                No se ha encontrado a nadie con «{query.trim()}»
              </Text>
            ) : (
              friends.map((conversation) => (
                <FriendRow
                  key={conversation.id}
                  conversation={conversation}
                  onPress={() => onOpenConversation(conversation.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      <UserSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelectUser={handleSelectUser}
        title="Añadir amigo"
        subtitle="Busca un usuario por nombre o email para empezar a hablar"
      />
    </View>
  );
}

function displayName(c: DirectConversation): string {
  return c.userName || c.userEmail || `Usuario ${c.userId}`;
}

function FriendRow({ conversation, onPress }: { conversation: DirectConversation; onPress: () => void }) {
  const name = displayName(conversation);
  const hue = (conversation.userId * 137.508) % 360;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-dark-border-subtle px-2 py-3 rounded-lg active:bg-dark-bg-hover"
    >
      <UserAvatar
        avatarUrl={conversation.userAvatarUrl ? `${API_URL}${conversation.userAvatarUrl}` : null}
        size={36}
        borderColor="transparent"
        borderWidth={0}
        fallbackText={name}
        fallbackColor={`hsl(${hue}, 70%, 50%)`}
      />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-dark-text-primary" numberOfLines={1}>
          {name}
        </Text>
        {conversation.userEmail && conversation.userName ? (
          <Text className="text-xs text-dark-text-muted" numberOfLines={1}>
            {conversation.userEmail}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Enviar mensaje a ${name}`}
        className="h-9 w-9 items-center justify-center rounded-full bg-dark-bg-elevated border border-dark-border-default active:bg-dark-bg-hover"
      >
        <DirectMessagesIcon size={16} color="#b4b4c0" />
      </Pressable>
    </Pressable>
  );
}
