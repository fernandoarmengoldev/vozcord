import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AddIcon, UserIcon, DeleteIcon, MemberIcon } from '../common/Icons';
import { ConversationItem } from './ConversationItem';
import { CategorySection } from './CategorySection';
import ChannelCreateModal from './ChannelCreateModal';
import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu';
import UserSearchModal from '../common/UserSearchModal';
import { apiFetch } from '../../lib/api';

export type { DirectConversation };

import type { VoiceMemberWithAvatar } from '../../types/main.types';

type DirectConversation = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail?: string;
  userAvatarUrl?: string | null;
  lastMessageAt?: string;
};

type Channel = {
  id: number;
  name: string;
  type: 'text' | 'voice';
  categoryId?: number | null;
};

type Props = {
  channels: Channel[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  wide?: boolean;
  onChannelCreate: (name: string, type: 'text' | 'voice') => Promise<void>;
  onChannelDelete: (channelId: number) => void;
  voiceMembers?: Map<number, VoiceMemberWithAvatar[]>;
  members?: Array<{ id: number; name: string | null; email?: string }>;
  // DM mode props
  dmMode?: boolean;
  conversations?: DirectConversation[];
  selectedConversationId?: number | null;
  onConversationSelect?: (id: number) => void;
  onStartDM?: (userId: number) => void | Promise<void>;
  // Botón "Amigos" (pantalla de inicio)
  friendsSelected?: boolean;
  onFriendsPress?: () => void;
};

export default function ChannelSidebar({
  channels,
  selectedId,
  onSelect,
  wide,
  onChannelCreate,
  onChannelDelete,
  voiceMembers,
  members,
  dmMode = false,
  conversations = [],
  selectedConversationId,
  onConversationSelect,
  onStartDM,
  friendsSelected = false,
  onFriendsPress,
}: Props) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [userSearchVisible, setUserSearchVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    channel: Channel | null;
  }>({ visible: false, channel: null });

  const grouped = useMemo(() => {
    const text = channels.filter((c) => c.type === 'text');
    const voice = channels.filter((c) => c.type === 'voice');
    return { text, voice };
  }, [channels]);

  const getContextMenuItems = (channel: Channel): ContextMenuItem[] => [
    {
      label: 'Eliminar Canal',
      icon: <DeleteIcon size={20} color="#ef4444" />,
      danger: true,
      onPress: async () => {
        // TODO: Add confirmation dialog
        try {
          console.log('Deleting channel:', channel.id);
          const res = await apiFetch(`/channels/${channel.id}`, {
            method: 'DELETE',
            auth: true,
          });
          console.log('Delete response status:', res.status);
          if (res.ok) {
            console.log('Channel deleted successfully');
            onChannelDelete(channel.id);
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error('Failed to delete channel:', errorData);
          }
        } catch (error) {
          console.error('Error deleting channel:', error);
        }
      },
    },
  ];

  const handleChannelLongPress = (channel: Channel) => {
    setContextMenu({ visible: true, channel });
  };

  const handleStartDM = async (user: { id: number; name: string | null; email: string }) => {
    try {
      // Antes se recargaba la página entera: en web se perdía la conversación recién
      // abierta (el store no persiste) y en nativo crasheaba
      await onStartDM?.(user.id);
    } catch (error) {
      console.error('Error starting DM:', error);
      alert('Error al iniciar conversación');
    }
  };

  return (
    <>
      <View
        className={`h-full flex-1 border border-dark-border-subtle bg-dark-bg-secondary shadow-2xl shadow-black/40 overflow-hidden`}
      >
        {dmMode ? (
          // DM Mode
          <View className="flex-1">
            {/* Inicio: Amigos */}
            <View className="px-3 pt-3 pb-2 border-b border-dark-border-default">
              <Pressable
                onPress={onFriendsPress}
                accessibilityRole="button"
                className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 border ${friendsSelected
                    ? 'bg-dark-accent-purple/30 border-dark-accent-purple-light/55'
                    : 'bg-dark-bg-tertiary border-dark-border-subtle active:bg-dark-bg-hover'
                  }`}
              >
                <MemberIcon size={20} color={friendsSelected ? '#e8e8ed' : '#b4b4c0'} />
                <Text
                  className={`text-sm ${friendsSelected ? 'text-dark-text-primary font-semibold' : 'text-dark-text-secondary'}`}
                >
                  Amigos
                </Text>
              </Pressable>
            </View>

            <View className="px-4 pt-4 pb-1 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wider text-dark-text-tertiary">
                Mensajes directos
              </Text>
              <Pressable
                onPress={() => setUserSearchVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Nuevo mensaje directo"
                className="p-1.5 rounded-lg active:bg-dark-bg-hover"
              >
                <AddIcon size={14} color="#b4b4c0" />
              </Pressable>
            </View>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12, gap: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {conversations.length === 0 ? (
                <Animated.View entering={FadeIn.duration(400)} className="items-center py-12 px-4">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-dark-bg-elevated mb-4">
                    <UserIcon size={28} color="#8a8a99" />
                  </View>
                  <Text className="text-sm text-dark-text-tertiary text-center">
                    No hay conversaciones activas
                  </Text>
                </Animated.View>
              ) : (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    selected={conversation.id === selectedConversationId}
                    onPress={() => onConversationSelect?.(conversation.id)}
                  />
                ))
              )}
            </ScrollView>
          </View>
        ) : (
          // Server Mode
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 12, gap: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <CategorySection
              title="Canales de Texto"
              channels={grouped.text}
              selectedId={selectedId}
              onSelect={onSelect}
              onChannelLongPress={handleChannelLongPress}
            />

            <CategorySection
              title="Canales de Voz"
              channels={grouped.voice}
              selectedId={selectedId}
              onSelect={onSelect}
              onChannelLongPress={handleChannelLongPress}
              voiceMembers={voiceMembers}
            />

            <Pressable
              onPress={() => setCreateModalVisible(true)}
              className="rounded-2xl border border-dashed border-dark-border-strong px-4 py-3 bg-dark-bg-tertiary active:bg-dark-bg-hover"
            >
              <View className="flex-row items-center justify-center gap-2">
                <AddIcon size={16} color="#e8e8ed" />
                <Text className="text-center text-sm text-dark-text-secondary">Nuevo canal</Text>
              </View>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Channel Create Modal */}
      <ChannelCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={onChannelCreate}
      />

      {/* Channel Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        onClose={() => setContextMenu({ visible: false, channel: null })}
        items={contextMenu.channel ? getContextMenuItems(contextMenu.channel) : []}
        title={contextMenu.channel?.name}
      />

      {/* User Search Modal for DMs */}
      <UserSearchModal
        visible={userSearchVisible}
        onClose={() => setUserSearchVisible(false)}
        onSelectUser={handleStartDM}
        title="Nuevo mensaje directo"
        subtitle="Busca un usuario para iniciar una conversación"
      />
    </>
  );
}
