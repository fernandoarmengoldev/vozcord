import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useZustandStore } from '../../lib/store';
import type { Channel, Member, Server, VoiceMembersMap } from '../../types/main.types';
import type { DirectConversation } from '../channels/ChannelSidebar';
import ServerSidebar from '../servers/ServerSidebar';
import ChannelSidebar from '../channels/ChannelSidebar';
import ChannelView from '../channels/ChannelView';
import DirectMessagesView from '../dm/DirectMessagesView';
import MemberSidebar from '../member/MemberList';
import FriendsView from '../home/FriendsView';
import { UserControlPanel } from '../settings/UserControlPanel';

interface CompactLayoutProps {
  servers: Server[];
  channels: Channel[];
  members: Member[];
  conversations: DirectConversation[];
  currentServer: Server | null;
  currentChannel: Channel | null;
  voiceMembers: VoiceMembersMap;
  onServerSelect: (id: number) => void;
  onChannelSelect: (id: number) => void;
  onConversationSelect: (id: number) => void;
  onServerCreate: (name: string, imageUri: string) => Promise<void>;
  onServerDelete: (serverId: number) => void;
  onChannelCreate: (name: string, type: 'text' | 'voice') => Promise<void>;
  onChannelDelete: (channelId: number) => void;
  onDMPress: () => void;
  onStartDM: (userId: number) => void | Promise<void>;
  onServerUpdate: () => void;
  onMemberAdded: () => void;
  onLogout: () => void;
}

/**
 * Layout para pantallas estrechas (< 900 px), al estilo de Discord en móvil:
 * una pantalla de listas (servidores + canales / mensajes directos) y, al elegir algo,
 * el canal, la conversación o Amigos a pantalla completa con botón de volver.
 */
export default function CompactLayout(props: CompactLayoutProps) {
  return <CompactScreens {...props} />;
}

function CompactScreens({
  servers,
  channels,
  members,
  conversations,
  currentServer,
  currentChannel,
  voiceMembers,
  onServerSelect,
  onChannelSelect,
  onConversationSelect,
  onServerCreate,
  onServerDelete,
  onChannelCreate,
  onChannelDelete,
  onDMPress,
  onStartDM,
  onServerUpdate,
  onMemberAdded,
  onLogout,
}: CompactLayoutProps) {
  const {
    canalActual,
    dmActual,
    dmMode,
    miembrosVisible,
    toggleMiembros,
    setMiembrosVisible,
    limpiarCanal,
    limpiarDM,
  } = useZustandStore();
  const [showFriends, setShowFriends] = useState(false);

  // Sin servidor seleccionado siempre se muestra el inicio (Amigos + mensajes directos)
  const homeMode = dmMode || !currentServer;
  const currentConversation = conversations.find((c) => c.id === dmActual);

  const openConversation = (id: number) => {
    setShowFriends(false);
    onConversationSelect(id);
  };

  // Conversación directa a pantalla completa
  if (homeMode && dmActual) {
    return (
      <View className="flex-1">
        <DirectMessagesView
          conversationId={dmActual}
          peerName={currentConversation?.userName || currentConversation?.userEmail}
          showBack
          onBack={() => limpiarDM()}
          onLogout={onLogout}
        />
      </View>
    );
  }

  // Amigos a pantalla completa
  if (homeMode && showFriends) {
    return (
      <View className="flex-1">
        <FriendsView
          conversations={conversations}
          onOpenConversation={openConversation}
          onStartDM={async (userId) => {
            setShowFriends(false);
            await onStartDM(userId);
          }}
          showBack
          onBack={() => setShowFriends(false)}
        />
      </View>
    );
  }

  // Canal a pantalla completa (con la lista de miembros como panel lateral)
  if (!homeMode && currentChannel) {
    return (
      <View className="flex-1 relative">
        <ChannelView
          channel={currentChannel}
          showBack
          onBack={() => limpiarCanal()}
          onToggleMembers={() => toggleMiembros()}
          membersVisible={miembrosVisible}
          members={members}
        />
        {/* El panel de usuario solo se muestra en la pantalla de listas: aquí tapaba el cuadro de mensaje */}
        {miembrosVisible && currentServer && (
          <View className="absolute top-0 bottom-0 left-0 right-0 z-50 flex-row">
            <Pressable
              className="flex-1 bg-black/50"
              accessibilityLabel="Cerrar lista de miembros"
              onPress={() => setMiembrosVisible(false)}
            />
            <MemberSidebar
              users={members}
              serverId={currentServer.id}
              onClose={() => setMiembrosVisible(false)}
              onStartDM={onStartDM}
              onMemberAdded={onMemberAdded}
            />
          </View>
        )}
      </View>
    );
  }

  // Pantalla de listas
  return (
    <View className="flex-1 flex-col">
      <View className="flex-1 flex-row">
        <ServerSidebar
          servers={servers}
          selectedId={currentServer?.id ?? null}
          onSelect={onServerSelect}
          onServerCreate={onServerCreate}
          onServerDelete={onServerDelete}
          onServerUpdate={onServerUpdate}
          onDMPress={onDMPress}
          dmMode={homeMode}
        />
        <ChannelSidebar
          wide
          channels={channels}
          selectedId={canalActual}
          onSelect={onChannelSelect}
          onChannelCreate={onChannelCreate}
          onChannelDelete={onChannelDelete}
          voiceMembers={voiceMembers}
          members={members}
          dmMode={homeMode}
          conversations={conversations}
          selectedConversationId={dmActual}
          onConversationSelect={openConversation}
          onStartDM={onStartDM}
          onFriendsPress={() => setShowFriends(true)}
        />
      </View>
      {/* Panel de control de usuario (móvil) */}
      <UserControlPanel />
    </View>
  );
}
