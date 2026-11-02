import { useEffect, useRef } from 'react';
import { useVoice } from '../../lib/useVoice';
import { useZustandStore } from '../../lib/store';

/**
 * Reproduce el audio de todos los participantes remotos de la llamada activa (web).
 * Está montado a nivel de la pantalla principal y no dentro de la vista del canal de voz:
 * antes el <audio> vivía en VideoTile y, al ir a otro canal o a mensajes directos,
 * seguías en la llamada pero dejabas de oír a todo el mundo.
 */
export function RemoteAudio() {
  const { connected, peers } = useVoice();
  if (!connected) return null;

  return (
    <>
      {Array.from(peers.values())
        .filter((peer) => peer.audioStream)
        .map((peer) => (
          <PeerAudio key={peer.peerId} stream={peer.audioStream!} />
        ))}
    </>
  );
}

function PeerAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  const isDeafened = useZustandStore((state) => state.isDeafened);
  const outputDeviceId = useZustandStore((state) => state.audioDevicePreferences.selectedOutputDeviceId);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch((error) => console.warn('[RemoteAudio] No se pudo reproducir el audio:', error));
    return () => {
      el.srcObject = null;
    };
  }, [stream]);

  // Ensordecer
  useEffect(() => {
    if (ref.current) ref.current.muted = isDeafened;
  }, [isDeafened]);

  // Dispositivo de salida elegido (también para participantes que entran después)
  useEffect(() => {
    const el = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (el && outputDeviceId && typeof el.setSinkId === 'function') {
      el.setSinkId(outputDeviceId).catch(() => {});
    }
  }, [outputDeviceId, stream]);

  return <audio ref={ref} autoPlay playsInline style={{ display: 'none' }} />;
}
