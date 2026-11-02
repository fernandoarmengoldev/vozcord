import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CloseIcon, AddIcon } from '../common/Icons';
import MemberItem, { type User } from './MemberItem';
import UserSearchModal from '../common/UserSearchModal';
import { apiFetch } from '../../lib/api';

type Props = {
  users: User[];
  serverId?: number;
  onClose?: () => void;
  onStartDM?: (userId: number, name?: string | null) => void;
  onMemberAdded?: () => void;
};

export default function MemberSidebar({ users, serverId, onClose, onStartDM, onMemberAdded }: Props) {
  const [userSearchVisible, setUserSearchVisible] = useState(false);

  const handleAddMember = async (user: { id: number; name: string | null; email: string }) => {
    if (!serverId) return;

    try {
      const res = await apiFetch(`/servers/${serverId}/members`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        // Notificar que se añadió un miembro
        onMemberAdded?.();
        alert(`${user.name || user.email} añadido al servidor`);
      } else {
        const error = await res.json();
        if (error.error === 'user already member') {
          alert('Este usuario ya es miembro del servidor');
        } else {
          alert('Error al añadir miembro');
        }
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error de conexión');
    }
  };

  return (
    <>
      <View className="h-full w-[280px] border border-dark-border-subtle bg-dark-bg-secondary overflow-hidden shadow-2xl shadow-black/40">
        <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-dark-border-default bg-dark-bg-tertiary">
          <Text className="text-sm font-semibold text-dark-text-primary">Miembros</Text>
          <View className="flex-row items-center gap-2">
            {serverId && (
              <Pressable
                onPress={() => setUserSearchVisible(true)}
                className="rounded-[14px] px-2.5 py-1.5 bg-dark-accent-blue/20 border border-dark-accent-blue-light/30 active:bg-dark-accent-blue/30"
              >
                <AddIcon size={16} color="#60a5fa" />
              </Pressable>
            )}
            {onClose && (
              <Pressable
                onPress={onClose}
                className="rounded-[14px] px-3 py-1.5 bg-dark-bg-elevated border border-dark-border-default active:bg-dark-bg-hover"
              >
                <CloseIcon size={16} color="#e8e8ed" />
              </Pressable>
            )}
          </View>
        </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {users.map((user) => (
          <MemberItem
            key={user.id}
            user={user}
            onPress={() => onStartDM?.(user.id, user.name ?? user.email)}
          />
        ))}

        {users.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-sm text-dark-text-tertiary">No hay miembros</Text>
          </View>
        )}
      </ScrollView>
      </View>

      {/* User Search Modal for adding members */}
      <UserSearchModal
        visible={userSearchVisible}
        onClose={() => setUserSearchVisible(false)}
        onSelectUser={handleAddMember}
        title="Añadir miembro"
        subtitle="Busca un usuario para añadir al servidor"
      />
    </>
  );
}