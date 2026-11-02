import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { apiFetch } from '../../lib/api';
import { BackIcon, LogoutIcon, UserIcon } from '../common/Icons';
import { MessageSkeleton } from '../messages/MessageSkeleton';
import { MessageItem, type Message } from '../messages/MessageItem';
import { EmptyMessages } from '../messages/EmptyMessages';
import { MessageComposer } from '../messages/MessageComposer';
import { useChat } from '../../hooks/useChat';

type Props = {
  conversationId: number;
  peerName?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  onLogout?: () => void;
};

export default function DirectMessagesView({ conversationId, peerName, showBack, onBack, onLogout }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const chat = useChat();

  // Cargar historial de mensajes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/dms/${conversationId}/messages`, { method: 'GET', auth: true });
        if (res.ok) {
          const data = (await res.json()) as { messages: Message[] };
          setMessages(data.messages ?? []);
        } else {
          setMessages([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [conversationId]);

  // Suscribirse a la conversación para recibir mensajes en tiempo real
  useEffect(() => {
    if (!chat.authenticated) {
      return;
    }

    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
    };

    chat.subscribeToConversation(conversationId, handleNewMessage);

    return () => {
      chat.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId, chat.authenticated]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;

    setInput('');
    try {
      await chat.sendDirectMessage(conversationId, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [conversationId, input, chat]);

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View className="flex-1 border border-dark-border-subtle bg-dark-bg-tertiary overflow-hidden shadow-2xl shadow-black/30">
        {/* Header */}
        <View className="flex-row items-center justify-between px-[18px] py-3.5 border-b border-dark-border-default bg-dark-bg-secondary">
          <View className="flex-row items-center gap-3 flex-1">
            {showBack && (
              <Pressable
                onPress={onBack}
                className="rounded-[14px] px-3 py-2 bg-dark-bg-elevated border border-dark-border-default active:bg-dark-bg-hover"
              >
                <BackIcon size={18} color="#e8e8ed" />
              </Pressable>
            )}
            <UserIcon size={20} color="#8a8a99" />
            <Text className="text-base font-semibold text-dark-text-primary" numberOfLines={1}>
              {peerName ?? 'Directo'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            {onLogout && (
              <Pressable
                onPress={onLogout}
                className="rounded-[14px] px-3.5 py-2 bg-dark-bg-elevated border border-dark-border-default active:bg-dark-bg-hover"
              >
                <LogoutIcon size={18} color="#ef4444" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Messages */}
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <>
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
              </>
            ) : messages.length === 0 ? (
              <EmptyMessages
                icon={<UserIcon size={28} color="#8a8a99" />}
                title="Comienza una conversación"
                subtitle={`Este es el inicio de tu conversación con ${peerName ?? 'este usuario'}`}
              />
            ) : (
              messages.map((msg, idx) => <MessageItem key={msg.id} message={msg} index={idx} />)
            )}
          </ScrollView>

          <MessageComposer
            input={input}
            setInput={setInput}
            onSend={handleSend}
            disabled={input.trim().length === 0}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
