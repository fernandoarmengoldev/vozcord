import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { apiFetch } from '../../lib/api';
import {
  TextChannelIcon,
  VoiceChannelIcon,
  BackIcon,
  MemberIcon,
  LogoutIcon,
} from '../common/Icons';
import { VoiceControls } from './VoiceControls';
import { VideoGrid } from './VideoGrid';
import { TranscriptionPanel } from './TranscriptionPanel';
import { useVoice } from '../../lib/useVoice';
import { useTranscription } from '../../lib/useTranscription';
import { useZustandStore } from '../../lib/store';
// Animated debe venir de reanimated: el Animated de react-native ignora la prop `entering`
import Animated, { FadeIn } from 'react-native-reanimated';
import { MessageSkeleton } from '../messages/MessageSkeleton';
import { MessageItem, type Message } from '../messages/MessageItem';
import { EmptyMessages } from '../messages/EmptyMessages';
import { MessageComposer } from '../messages/MessageComposer';
import { useChat } from '../../hooks/useChat';

type ChannelItem = { id: number; name: string; type: 'text' | 'voice' };

// Botón estilo Discord para mostrar/ocultar la lista de miembros
function MembersToggleButton({ visible, count, onPress }: { visible?: boolean; count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Ocultar lista de miembros' : 'Mostrar lista de miembros'}
      className={`flex-row items-center gap-2 rounded-[14px] px-3 py-2 border ${visible
          ? 'bg-dark-accent-purple/30 border-dark-accent-purple-light/55'
          : 'bg-dark-bg-elevated border-dark-border-default active:bg-dark-bg-hover'
        }`}
    >
      <MemberIcon size={18} color={visible ? '#e8e8ed' : '#8a8a99'} />
      <Text className={`text-[13px] font-semibold ${visible ? 'text-dark-text-primary' : 'text-dark-text-tertiary'}`}>
        {count}
      </Text>
    </Pressable>
  );
}

type Props = {
  channel: ChannelItem | null;
  showBack?: boolean;
  onBack?: () => void;
  onToggleMembers?: () => void;
  membersVisible?: boolean;
  onLogout?: () => void;
  members?: Array<{ id: number; name: string | null; email?: string; avatarUrl?: string | null }>;
};

export default function ChannelView({
  channel,
  showBack,
  onBack,
  onToggleMembers,
  membersVisible,
  onLogout,
  members = [],
}: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const userId = useZustandStore((state) => state.userId);
  const { connected, peers, getLocalStream, videoEnabled, audioEnabled } = useVoice();
  const chat = useChat();

  // Hook de transcripción
  const { transcriptions, isSupported, isModelReady, loadingProgress, clearTranscriptions } = useTranscription({
    enabled: transcriptionEnabled && connected && channel?.type === 'voice',
    peers,
    language: 'es-ES',
  });

  // Cargar historial de mensajes
  useEffect(() => {
    if (!channel || channel.type !== 'text') {
      setMessages([]);
      return;
    }

    setLoading(true);
    const load = async () => {
      try {
        const res = await apiFetch(`/channels/${channel.id}/messages`, { method: 'GET', auth: true });
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
  }, [channel?.id, channel?.type]);

  // Suscribirse al canal para recibir mensajes en tiempo real
  useEffect(() => {
    if (!channel || channel.type !== 'text' || !chat.authenticated) {
      return;
    }

    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
    };

    chat.subscribeToChannel(channel.id, handleNewMessage);

    return () => {
      chat.unsubscribeFromChannel(channel.id);
    };
  }, [channel?.id, channel?.type, chat.authenticated]);

  const handleSend = useCallback(async () => {
    if (!channel) return;
    const content = input.trim();
    if (!content) return;

    setInput('');
    try {
      await chat.sendChannelMessage(channel.id, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [channel, input, chat]);

  if (!channel) {
    return (
      <View className="flex-1 border border-dark-border-subtle bg-dark-bg-tertiary">
        {onToggleMembers && (
          <View className="flex-row items-center justify-end px-[18px] py-3.5 border-b border-dark-border-default bg-dark-bg-secondary">
            <MembersToggleButton visible={membersVisible} count={members.length} onPress={onToggleMembers} />
          </View>
        )}
        <View className="flex-1 items-center justify-center p-6">
          <Animated.View entering={FadeIn.duration(400)} className="items-center gap-3">
            <Text className="text-base text-dark-text-secondary">Selecciona un canal</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

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
            {channel.type === 'text' ? (
              <TextChannelIcon size={20} color="#8a8a99" />
            ) : (
              <VoiceChannelIcon size={20} color="#8a8a99" />
            )}
            <Text className="text-base font-semibold text-dark-text-primary" numberOfLines={1}>
              {channel.name}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            {onToggleMembers && (
              <MembersToggleButton visible={membersVisible} count={members.length} onPress={onToggleMembers} />
            )}
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

        {/* Content */}
        {channel.type === 'voice' ? (
          <View className="flex-1 bg-dark-bg-primary">
            {/* Main content area - Video Grid OR Transcription Panel */}
            <View className="flex-1">
              {transcriptionEnabled ? (
                <Animated.View entering={FadeIn.duration(300)} className="flex-1 p-4">
                  <TranscriptionPanel
                    transcriptions={transcriptions}
                    members={members}
                    onClear={clearTranscriptions}
                    isSupported={isSupported}
                    isModelReady={isModelReady}
                    loadingProgress={loadingProgress}
                  />
                </Animated.View>
              ) : (
                <View className="flex-1">
                  <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {connected && peers.size > 0 ? (
                      <Animated.View entering={FadeIn.duration(400)} className="flex-1 min-h-full">
                        <VideoGrid
                          peers={peers}
                          members={members}
                          localStream={getLocalStream()}
                          currentUserId={userId ?? undefined}
                          localVideoEnabled={videoEnabled}
                          localAudioEnabled={audioEnabled}
                        />
                      </Animated.View>
                    ) : (
                      <View className="flex-1 items-center justify-center p-6">
                        <Animated.View entering={FadeIn.duration(400)} className="items-center gap-4">
                          <View className="h-24 w-24 items-center justify-center rounded-full bg-dark-accent-blue/20">
                            <VoiceChannelIcon size={48} color="#3b82f6" />
                          </View>
                          <Text className="text-lg font-semibold text-dark-text-primary">
                            Canal de voz
                          </Text>
                          <Text className="text-sm text-dark-text-tertiary text-center max-w-sm">
                            Conecta para unirte al canal de voz y video
                          </Text>
                        </Animated.View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Voice Controls - Fixed at bottom, no flex */}
            {userId && (
              <View className="p-4 border-t border-dark-border-subtle bg-dark-bg-secondary">
                <VoiceControls
                  channelId={channel.id.toString()}
                  userId={userId}
                  members={members}
                  transcriptionEnabled={transcriptionEnabled}
                  onToggleTranscription={() => setTranscriptionEnabled(!transcriptionEnabled)}
                />
              </View>
            )}
          </View>
        ) : (
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
                <EmptyMessages icon={<TextChannelIcon size={28} color="#8a8a99" />} />
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
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
