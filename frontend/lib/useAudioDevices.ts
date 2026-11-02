import { useState, useEffect, useCallback } from 'react'
import { voiceService } from './voiceService'
import { useZustandStore } from './store'
import { getStoredItem, setStoredItem } from './storage'
import { Platform } from 'react-native'

const AUDIO_DEVICE_PREFS_KEY = 'audio_device_preferences'

export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

/**
 * Custom hook for managing audio device selection
 * Handles device enumeration, switching, and persistence
 */
export function useAudioDevices() {
  const {
    audioDevicePreferences,
    setSelectedInputDevice,
    setSelectedOutputDevice,
    setSelectedVideoInputDevice,
  } = useZustandStore()

  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([])
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([])
  const [videoInputDevices, setVideoInputDevices] = useState<AudioDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load device preferences from secure storage
   */
  const loadPreferences = useCallback(async () => {
    try {
      const stored = await getStoredItem(AUDIO_DEVICE_PREFS_KEY)
      if (stored) {
        const prefs = JSON.parse(stored)
        setSelectedInputDevice(prefs.selectedInputDeviceId)
        setSelectedOutputDevice(prefs.selectedOutputDeviceId)
        // Check if video preference exists (added later)
        if (prefs.selectedVideoInputDeviceId) {
          setSelectedVideoInputDevice(prefs.selectedVideoInputDeviceId)
        }

        // Apply preferences to voice service
        voiceService.setDevicePreferences(
          prefs.selectedInputDeviceId,
          prefs.selectedOutputDeviceId
        )

        console.log('Loaded device preferences:', prefs)
      }
    } catch (err) {
      console.error('Error loading device preferences:', err)
    }
  }, [setSelectedInputDevice, setSelectedOutputDevice, setSelectedVideoInputDevice])

  /**
   * Save device preferences to secure storage
   */
  const savePreferences = useCallback(async () => {
    try {
      await setStoredItem(
        AUDIO_DEVICE_PREFS_KEY,
        JSON.stringify(audioDevicePreferences)
      )
      console.log('Saved device preferences:', audioDevicePreferences)
    } catch (err) {
      console.error('Error saving device preferences:', err)
    }
  }, [audioDevicePreferences])

  /**
   * Enumerate available media devices
   */
  const enumerateDevices = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { inputs, outputs, videoInputs } = await voiceService.enumerateDevices()

      // Convert to our AudioDevice interface
      const mappedInputs: AudioDevice[] = inputs.map((device: any) => ({
        deviceId: device.deviceId,
        label: device.label || 'Unknown Device',
        kind: 'audioinput',
      }))

      const mappedOutputs: AudioDevice[] = outputs.map((device: any) => ({
        deviceId: device.deviceId,
        label: device.label || 'Unknown Device',
        kind: 'audiooutput',
      }))

      const mappedVideoInputs: AudioDevice[] = videoInputs.map((device: any) => ({
        deviceId: device.deviceId,
        label: device.label || 'Unknown Camera',
        kind: 'videoinput', // We need to update interface or cast here
      } as any))

      setInputDevices(mappedInputs)
      setOutputDevices(mappedOutputs)
      setVideoInputDevices(mappedVideoInputs)

      console.log(`Enumerated ${mappedInputs.length} inputs, ${mappedOutputs.length} outputs, ${mappedVideoInputs.length} cameras`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enumerate devices'
      setError(errorMessage)
      console.error('Error enumerating devices:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Switch to a different input device
   */
  const selectInputDevice = useCallback(
    async (deviceId: string) => {
      try {
        await voiceService.switchInputDevice(deviceId)
        setSelectedInputDevice(deviceId)
        console.log('Selected input device:', deviceId)
      } catch (err) {
        console.error('Error selecting input device:', err)
        throw err
      }
    },
    [setSelectedInputDevice]
  )

  /**
   * Switch to a different output device
   */
  const selectOutputDevice = useCallback(
    async (deviceId: string) => {
      try {
        await voiceService.switchOutputDevice(deviceId)
        setSelectedOutputDevice(deviceId)
        console.log('Selected output device:', deviceId)
      } catch (err) {
        console.error('Error selecting output device:', err)
        throw err
      }
    },
    [setSelectedOutputDevice]
  )

  /**
   * Switch to a different video input device
   */
  const selectVideoInputDevice = useCallback(
    async (deviceId: string) => {
      try {
        await voiceService.switchVideoInputDevice(deviceId)
        setSelectedVideoInputDevice(deviceId)
        console.log('Selected video input device:', deviceId)
      } catch (err) {
        console.error('Error selecting video input device:', err)
        throw err
      }
    },
    [setSelectedVideoInputDevice]
  )

  /**
   * Refresh device list
   * Useful when devices are connected/disconnected
   */
  const refreshDevices = useCallback(async () => {
    await enumerateDevices()
  }, [enumerateDevices])

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Save preferences whenever they change
  useEffect(() => {
    if (
      audioDevicePreferences.selectedInputDeviceId !== null ||
      audioDevicePreferences.selectedOutputDeviceId !== null ||
      audioDevicePreferences.selectedVideoInputDeviceId !== null
    ) {
      savePreferences()
    }
  }, [audioDevicePreferences, savePreferences])

  // Listen for device changes (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const handleDeviceChange = () => {
        console.log('Media devices changed, refreshing list...')
        enumerateDevices()
      }

      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      }
    }
  }, [enumerateDevices])

  return {
    // Device lists
    inputDevices,
    outputDevices,
    videoInputDevices,

    // Selected devices
    selectedInputDeviceId: audioDevicePreferences.selectedInputDeviceId,
    selectedOutputDeviceId: audioDevicePreferences.selectedOutputDeviceId,
    selectedVideoInputDeviceId: audioDevicePreferences.selectedVideoInputDeviceId,

    // Actions
    enumerateDevices,
    selectInputDevice,
    selectOutputDevice,
    selectVideoInputDevice,
    refreshDevices,

    // State
    loading,
    error,
  }
}
