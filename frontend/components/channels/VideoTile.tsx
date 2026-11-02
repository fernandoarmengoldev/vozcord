import { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import type { PeerInfo } from '../../lib/mediasoup/types';
import { UserAvatar } from '../common/UserAvatar';
import { MicOffIcon, VideoOffIcon } from '../common/Icons';
import { useVoiceActivityDetection } from '../../lib/useVoiceActivityDetection';

interface VideoTileProps {
  peer: PeerInfo;
  userName: string;
  avatarUrl?: string | null;
  isLocal?: boolean;
  localStream?: MediaStream;
  videoEnabled?: boolean;
  // Solo para el tile local: estado de mute del micrófono
  audioEnabled?: boolean;
}

export function VideoTile({ peer, userName, avatarUrl, isLocal = false, localStream, videoEnabled = true, audioEnabled = true }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = isLocal ? !!localStream?.getVideoTracks().length : !!peer.videoStream && !peer.videoPaused;
  // Hay audio = existe el stream y no está muteado (remoto: producer pausado; local: track deshabilitado)
  const hasAudioStream = isLocal ? !!localStream?.getAudioTracks().length : !!peer.audioStream;
  const hasAudio = hasAudioStream && (isLocal ? audioEnabled : !peer.audioPaused);
  const shouldShowVideo = hasVideo && videoEnabled;

  // Detectar actividad de voz
  const audioStream = isLocal ? localStream : peer.audioStream;
  const { isSpeaking } = useVoiceActivityDetection(audioStream, {
    threshold: 30,
    smoothing: 0.8,
    interval: 100,
  });

  // Animación del borde cuando está hablando
  const borderOpacity = useSharedValue(0);
  const borderScale = useSharedValue(1);

  useEffect(() => {
    if (isSpeaking && hasAudio) {
      // Animar el borde con pulsación
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.7, { duration: 300 })
        ),
        -1, // Repetir infinitamente
        true // Reversa
      );
      borderScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      // Desaparecer el borde suavemente
      borderOpacity.value = withTiming(0, { duration: 200 });
      borderScale.value = withTiming(1, { duration: 200 });
    }
  }, [isSpeaking, hasAudio]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
    transform: [{ scale: borderScale.value }],
  }));

  // Reproducir video
  useEffect(() => {
    if (!videoRef.current) return;

    const stream = isLocal ? localStream : peer.videoStream;
    // console.log('[VideoTile] Video effect triggered', { peerId: peer.peerId, hasStream: !!stream, shouldShowVideo, isLocal })

    if (stream && shouldShowVideo) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error('[VideoTile] Error playing video:', e));
    }
  }, [peer.videoStream, localStream, shouldShowVideo, isLocal]);

  return (
    <View className="relative w-full h-full">
      {/* El audio remoto se reproduce en RemoteAudio (global), no aquí */}
      {/* Borde verde animado cuando está hablando */}
      <Animated.View
        style={[
          animatedBorderStyle,
          {
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 12,
            borderWidth: 4,
            borderColor: '#22c55e',
            pointerEvents: 'none',
            zIndex: 10,
          },
        ]}
      />

      <View className="relative w-full h-full bg-dark-bg-elevated rounded-lg overflow-hidden border border-dark-border-subtle">
        {/* Video stream o avatar de fallback */}
        {shouldShowVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <UserAvatar
              avatarUrl={avatarUrl}
              size={80}
              fallbackText={userName}
              fallbackColor="#60a5fa"
            />
          </View>
        )}

        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
              {userName} {isLocal && '(Tú)'}
            </Text>
            <View className="flex-row gap-2">
              {!hasAudio && (
                <View className="bg-red-500/90 rounded-full p-1.5">
                  <MicOffIcon size={14} color="#fff" />
                </View>
              )}
              {!shouldShowVideo && (
                <View className="bg-red-500/90 rounded-full p-1.5">
                  <VideoOffIcon size={14} color="#fff" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Indicador de hablando en la esquina */}
        {isSpeaking && hasAudio && (
          <View className="absolute top-2 left-2">
            <View className="bg-green-500/90 rounded-full p-1.5">
              <View className="w-2 h-2 bg-white rounded-full" />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
