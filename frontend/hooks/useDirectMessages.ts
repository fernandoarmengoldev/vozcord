import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useZustandStore } from '../lib/store';
import type { DirectConversation } from '../components/channels/ChannelSidebar';

/**
 * Hook para manejar la lógica de mensajes directos
 * Gestiona conversaciones, inicio de nuevas conversaciones y modo DM
 */
export function useDirectMessages() {
  const { dmMode, setDM, limpiarDM, setDMMode } = useZustandStore();

  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  // Se incrementa para forzar la recarga de la lista (p. ej. tras iniciar una conversación nueva)
  const [reloadKey, setReloadKey] = useState(0);

  // Cargar conversaciones cuando se activa el modo DM
  useEffect(() => {
    const loadConversations = async () => {
      if (!dmMode) {
        setConversations([]);
        return;
      }
      setLoadingConversations(true);
      try {
        const res = await apiFetch('/dms', { method: 'GET', auth: true });
        if (res.ok) {
          const data = (await res.json()) as {
            conversations: Array<{
              conversation: { id: number };
              peer: { id: number; name: string | null; email: string; avatarUrl?: string | null };
              lastMessage: any;
            }>;
          };
          // Mapear la estructura anidada del backend a la estructura plana del frontend
          const mappedConversations: DirectConversation[] = (data.conversations ?? []).map((item) => ({
            id: item.conversation.id,
            userId: item.peer.id,
            userName: item.peer.name,
            userEmail: item.peer.email,
            userAvatarUrl: item.peer.avatarUrl,
            lastMessageAt: item.lastMessage?.createdAt,
          }));
          setConversations(mappedConversations);
        } else {
          setConversations([]);
        }
      } finally {
        setLoadingConversations(false);
      }
    };
    loadConversations();
  }, [dmMode, reloadKey]);

  /**
   * Iniciar una conversación directa con un usuario
   */
  const handleStartDM = async (userId: number) => {
    const res = await apiFetch(`/dms/start`, {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      throw new Error('No se pudo iniciar la conversación');
    }
    const data = (await res.json()) as { conversation: { id: number } };
    setDM(data.conversation.id);
    setDMMode(true);
    setReloadKey((k) => k + 1);
  };

  /**
   * Activar el modo de mensajes directos
   */
  const handleDMPress = () => {
    // No se limpia el canal: al volver al servidor se recupera el último canal abierto
    setDMMode(true);
    limpiarDM();
  };

  /**
   * Seleccionar una conversación de la lista
   */
  const handleConversationSelect = (conversationId: number) => {
    setDM(conversationId);
    setDMMode(true);
  };

  return {
    conversations,
    loadingConversations,
    handleStartDM,
    handleDMPress,
    handleConversationSelect,
  };
}
