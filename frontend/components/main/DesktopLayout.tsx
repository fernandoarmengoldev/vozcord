import { View } from 'react-native';
import { useZustandStore } from '../../lib/store';
import type { Channel, Member, Server, VoiceMembersMap } from '../../types/main.types';
import type { DirectConversation } from '../channels/ChannelSidebar';
import ServerSidebar from '../servers/ServerSidebar';
import ChannelSidebar from '../channels/ChannelSidebar';
import ChannelView from '../channels/ChannelView';
import DirectMessagesView from '../dm/DirectMessagesView';
import MemberSidebar from '../member/MemberList';
import { UserControlPanel } from '../settings/UserControlPanel';
import FriendsView from '../home/FriendsView';

interface DesktopLayoutProps {
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

export default function DesktopLayout({
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
}: DesktopLayoutProps) {
  const {
    canalActual,
    dmActual,
    dmMode,
    miembrosVisible,
    toggleMiembros,
    setMiembrosVisible,
    limpiarDM,
  } = useZustandStore();

  // Sin servidor seleccionado siempre se muestra el inicio (Amigos + mensajes directos)
  const homeMode = dmMode || !currentServer;
  const currentConversation = conversations.find((c) => c.id === dmActual);

  return (
    <View className="flex-1 flex-row">
      <View>
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
            onConversationSelect={onConversationSelect}
            onStartDM={onStartDM}
            friendsSelected={homeMode && !dmActual}
            onFriendsPress={limpiarDM}
          />
        </View>
        <UserControlPanel />
      </View>

      {/* Área principal de contenido */}
      <View className="flex-1">
        {homeMode ? (
          dmActual ? (
            <DirectMessagesView
              conversationId={dmActual}
              peerName={currentConversation?.userName || currentConversation?.userEmail}
            />
          ) : (
            <FriendsView
              conversations={conversations}
              onOpenConversation={onConversationSelect}
              onStartDM={onStartDM}
            />
          )
        ) : (
          <ChannelView
            channel={currentChannel}
            onToggleMembers={() => toggleMiembros()}
            membersVisible={miembrosVisible}
            members={members}
          />
        )}
      </View>

      {/* Barra lateral de miembros */}
      {miembrosVisible && !homeMode && (
        <MemberSidebar
          users={members}
          serverId={currentServer?.id}
          onClose={() => setMiembrosVisible(false)}
          onStartDM={onStartDM}
          onMemberAdded={onMemberAdded}
        />
      )}
    </View>
  );
}
