import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AddIcon, DirectMessagesIcon, SettingsIcon, DeleteIcon } from '../common/Icons';
import ServerButton, { type Server } from './ServerButton';
import ServerCreateModal from './ServerCreateModal';
import ServerSettingsModal from './ServerSettingsModal';
import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu';
import { apiFetch } from '../../lib/api';
import { API_URL } from '../../lib/config';

type Props = {
  servers: Server[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onServerCreate: (name: string, imageUri: string) => Promise<void>;
  onServerDelete: (serverId: number) => void;
  onServerUpdate?: () => void;
  onDMPress?: () => void;
  dmMode?: boolean;
};

/**
 * DM button with animation (displayed first in the sidebar)
 */
const DMButton = ({ selected, onPress }: { selected: boolean; onPress: () => void }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`h-14 w-14 rounded-[22px] items-center justify-center border ${selected
            ? 'bg-dark-accent-purple border-dark-accent-purple-light'
            : 'bg-dark-bg-elevated border-dark-border-subtle'
          }`}
      >
        <DirectMessagesIcon size={22} color={selected ? '#e8e8ed' : '#b4b4c0'} />
      </Pressable>
    </Animated.View>
  );
};

/**
 * Server sidebar component showing server list
 */
export default function ServerSidebar({
  servers,
  selectedId,
  onSelect,
  onServerCreate,
  onServerDelete,
  onServerUpdate,
  onDMPress,
  dmMode = false,
}: Props) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    server: Server | null;
  }>({ visible: false, server: null });

  const handleOpenSettings = (server: Server) => {
    setSelectedServer(server);
    setSettingsModalVisible(true);
    setContextMenu({ visible: false, server: null });
  };

  const getContextMenuItems = (server: Server): ContextMenuItem[] => [
    {
      label: 'Configuración del Servidor',
      icon: <SettingsIcon size={20} color="#94a3b8" />,
      onPress: () => {
        handleOpenSettings(server);
      },
    },
    {
      label: 'Eliminar Servidor',
      icon: <DeleteIcon size={20} color="#ef4444" />,
      danger: true,
      onPress: async () => {
        try {
          console.log('🗑️ Deleting server:', server.id);
          const res = await apiFetch(`/servers/${server.id}`, {
            method: 'DELETE',
            auth: true,
          });
          console.log('Delete response status:', res.status);
          if (res.ok) {
            console.log('Server deleted successfully');
            onServerDelete(server.id);
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error('Failed to delete server:', errorData);
          }
        } catch (error) {
          console.error('Error deleting server:', error);
        }
      },
    },
  ];

  return (
    <>
      <View
        className="h-full border border-dark-border-subtle bg-dark-bg-secondary py-4 px-2.5 shadow-2xl shadow-black/50 overflow-hidden"
        style={{ width: 80 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: 'center', gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {onDMPress && (
            <View className="mb-2">
              <DMButton selected={dmMode} onPress={onDMPress} />
            </View>
          )}

          {onDMPress && servers.length > 0 && (
            <View className="h-[2px] w-8 bg-dark-border-strong rounded-full mb-1" />
          )}

          {servers.map((server) => (
            <ServerButton
              key={server.id}
              server={server}
              selected={!dmMode && server.id === selectedId}
              onPress={() => onSelect(server.id)}
              onLongPress={() => setContextMenu({ visible: true, server })}
            />
          ))}

          <View className="mt-2">
            <Pressable
              onPress={() => setCreateModalVisible(true)}
              className="h-14 w-14 items-center justify-center rounded-[22px] border border-dashed border-dark-border-strong bg-dark-bg-tertiary active:bg-dark-bg-hover"
            >
              <AddIcon size={22} color="#e8e8ed" />
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <ServerCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={onServerCreate}
      />

      <ServerSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        // El modal espera iconUrl absoluta; el servidor trae `icon` relativo (antes no se veía el icono actual)
        server={
          selectedServer
            ? {
                id: selectedServer.id,
                name: selectedServer.name,
                iconUrl: selectedServer.icon ? `${API_URL}${selectedServer.icon}` : null,
              }
            : null
        }
        onUpdate={() => {
          setSettingsModalVisible(false);
          onServerUpdate?.();
        }}
      />

      <ContextMenu
        visible={contextMenu.visible}
        onClose={() => setContextMenu({ visible: false, server: null })}
        items={contextMenu.server ? getContextMenuItems(contextMenu.server) : []}
        title={contextMenu.server?.name}
      />
    </>
  );
}
