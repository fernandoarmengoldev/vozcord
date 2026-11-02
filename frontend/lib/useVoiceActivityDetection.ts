import { useEffect, useState, useRef } from 'react';

interface VoiceActivityDetectionOptions {
  threshold?: number; // Umbral de volumen (0-255)
  smoothing?: number; // Suavizado de la detección (0-1)
  interval?: number; // Intervalo de muestreo en ms
}

/**
 * Hook para detectar actividad de voz en un MediaStream
 * Usa Web Audio API para analizar el volumen del audio
 */
export function useVoiceActivityDetection(
  stream: MediaStream | null | undefined,
  options: VoiceActivityDetectionOptions = {}
) {
  const {
    threshold = 30, // Umbral por defecto
    smoothing = 0.8, // Suavizado por defecto
    interval = 100, // Intervalo de muestreo por defecto (100ms)
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length) {
      setIsSpeaking(false);
      setVolume(0);
      return;
    }

    try {
      // Crear AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Crear analizador
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = smoothing;
      analyserRef.current = analyser;

      // Crear source desde el stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      // Buffer para almacenar los datos del analizador
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Función para analizar el audio
      const detectVoiceActivity = () => {
        const now = performance.now();

        // Solo analizar cada 'interval' ms
        if (now - lastCheckTimeRef.current >= interval) {
          lastCheckTimeRef.current = now;

          analyser.getByteFrequencyData(dataArray);

          // Calcular el volumen promedio
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

          setVolume(average);
          setIsSpeaking(average > threshold);
        }

        animationFrameRef.current = requestAnimationFrame(detectVoiceActivity);
      };

      // Iniciar detección
      detectVoiceActivity();

      // Cleanup
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        if (audioContextRef.current?.state !== 'closed') {
          audioContextRef.current?.close();
        }
      };
    } catch (error) {
      console.error('Error initializing voice activity detection:', error);
      setIsSpeaking(false);
      setVolume(0);
    }
  }, [stream, threshold, smoothing, interval]);

  return { isSpeaking, volume };
}
