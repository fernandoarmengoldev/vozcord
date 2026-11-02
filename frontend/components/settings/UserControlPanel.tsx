import { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, Platform, Pressable } from 'react-native'
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useVoice } from '../../lib/useVoice'
import { useZustandStore } from '../../lib/store'
import { useUserProfile } from '../../lib/useUserProfile'
import { useSession } from '../../lib/useSession'
import { AudioDeviceMenu } from './AudioDeviceMenu'
import { useAudioDevices } from '../../lib/useAudioDevices'
import SettingsModal from './SettingsModal'
import { UserAvatar } from '../common/UserAvatar'
import { API_URL } from '../../lib/config'

export function UserControlPanel() {
  const { logout } = useSession()
  const { connected, audioEnabled, videoEnabled, peers, disconnect, toggleAudio, toggleVideo } = useVoice()
  const { currentChannelName, audioDevicePreferences, isDeafened, setIsDeafened } = useZustandStore()
  const { userProfile } = useUserProfile()
  const [isMuted, setIsMuted] = useState(!audioEnabled)
  const [showSettings, setShowSettings] = useState(false)

  const {
    inputDevices,
    outputDevices,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    enumerateDevices,
    selectInputDevice,
    selectOutputDevice,
    loading: devicesLoading,
    videoInputDevices,
    selectVideoInputDevice,
  } = useAudioDevices()

  const [showInputDeviceMenu, setShowInputDeviceMenu] = useState(false)
  const [showOutputDeviceMenu, setShowOutputDeviceMenu] = useState(false)
  const [showVideoDeviceMenu, setShowVideoDeviceMenu] = useState(false)

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const expandHeight = useSharedValue(0)
  const muteButtonScale = useSharedValue(1)
  const deafenButtonScale = useSharedValue(1)
  const videoButtonScale = useSharedValue(1)
  const disconnectButtonScale = useSharedValue(1)

  useEffect(() => {
    setIsMuted(!audioEnabled)
  }, [audioEnabled])

  useEffect(() => {
    if (connected) {
      expandHeight.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      })
    } else {
      expandHeight.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      })
    }
  }, [connected])

  const expandedContainerStyle = useAnimatedStyle(() => ({
    height: expandHeight.value * 120,
    opacity: expandHeight.value,
    overflow: 'hidden',
  }))

  const muteButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: muteButtonScale.value }],
  }))

  const deafenButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: deafenButtonScale.value }],
  }))

  const videoButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: videoButtonScale.value }],
  }))

  const disconnectButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: disconnectButtonScale.value }],
  }))

  const animateButtonPress = (scaleValue: Animated.SharedValue<number>) => {
    scaleValue.value = withTiming(0.9, { duration: 100, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    setTimeout(() => {
      scaleValue.value = withSpring(1, { damping: 12, stiffness: 200 })
    }, 100)
  }

  const handleToggleMute = async () => {
    animateButtonPress(muteButtonScale)

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    if (connected) {
      await toggleAudio()
      setIsMuted(!isMuted)
    } else {
      setIsMuted(!isMuted)
    }
  }

  const handleToggleDeafen = async () => {
    animateButtonPress(deafenButtonScale)

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    const newDeafenState = !isDeafened
    setIsDeafened(newDeafenState)

    // Silenciar/activar todos los elementos de audio (mediasoup)
    if (Platform.OS === 'web') {
      const audioElements = document.querySelectorAll('audio')
      audioElements.forEach((audio) => {
        audio.muted = newDeafenState
      })
    }

    // Si se activa el ensordecer y no está muteado, mutear también el micrófono
    if (newDeafenState && !isMuted) {
      handleToggleMute()
    }
  }

  const handleToggleVideo = async () => {
    animateButtonPress(videoButtonScale)

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }

    try {
      await toggleVideo()
    } catch (error) {
      console.error('Error toggling video:', error)
      alert('Error al activar/desactivar video: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const handleMuteLongPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }

    await enumerateDevices()
    setShowInputDeviceMenu(true)
  }

  const handleDeafenLongPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }

    await enumerateDevices()
    setShowOutputDeviceMenu(true)
  }

  const handleVideoLongPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }

    await enumerateDevices()
    setShowVideoDeviceMenu(true)
  }

  const startLongPress = (handler: () => void, buttonType: 'mute' | 'deafen' | 'video') => {
    if (Platform.OS === 'web') return

    const timer = setTimeout(async () => {
      handler()
    }, 500)

    longPressTimerRef.current = timer
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleContextMenu = (e: any, handler: () => void) => {
    if (Platform.OS === 'web') {
      e.preventDefault()
      handler()
    }
  }

  const handleDisconnect = async () => {
    animateButtonPress(disconnectButtonScale)

    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }

    if (connected) {
      await disconnect()
    }
  }

  const handleSettings = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    setShowSettings(!showSettings)
  }

  const handleLogout = async () => {
    if (connected) {
      await disconnect()
    }

    await logout()
  }

  const displayName = userProfile?.name || userProfile?.email?.split('@')[0] || 'User'

  return (
    <View className="bg-dark-bg-secondary border-t border-dark-border-default p-4">
      {connected && (
        <Animated.View style={expandedContainerStyle}>
          <View>
            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-400 text-xs font-semibold">
                Voice Connected
              </Text>
              {currentChannelName && (
                <Text className="text-dark-text-tertiary text-xs ml-2">
                  / {currentChannelName}
                </Text>
              )}
            </View>

            <View className="flex-row gap-2">

              <Animated.View style={videoButtonAnimatedStyle} className="flex-1">
                <Pressable
                  onPress={handleToggleVideo}
                  onLongPress={handleVideoLongPress}
                  onPressIn={() => startLongPress(handleVideoLongPress, 'video')}
                  onPressOut={cancelLongPress}
                  onContextMenu={(e) => handleContextMenu(e, handleVideoLongPress)}
                  className={`backdrop-blur-xl rounded-lg border py-3 ${videoEnabled
                    ? 'bg-green-500/20 border-green-500/40'
                    : 'bg-dark-bg-elevated border-dark-border-default'}`}
                  style={{ cursor: Platform.OS === 'web' ? 'pointer' : undefined }}
                >
                  <View className="items-center">
                    <Ionicons
                      name={videoEnabled ? "videocam" : "videocam-off"}
                      size={20}
                      color={videoEnabled ? "#4ade80" : "#8a8a99"}
                    />
                    <Text className={`text-xs mt-1 ${videoEnabled ? 'text-green-400' : 'text-dark-text-tertiary'}`}>
                      Camera
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>

              <Animated.View style={disconnectButtonAnimatedStyle} className="flex-1">
                <TouchableOpacity
                  onPress={handleDisconnect}
                  className="bg-red-500/20 backdrop-blur-xl rounded-lg border border-red-500/40 py-3"
                  activeOpacity={0.7}
                >
                  <View className="items-center">
                    <MaterialIcons name="call-end" size={20} color="#ef4444" />
                    <Text className="text-red-400 text-xs mt-1">Leave</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      )}

      <View className="flex-row items-center gap-3 justify-between">
        <View className="flex-row items-center">
          <View className="mr-3">
            <UserAvatar
              avatarUrl={userProfile?.avatarUrl ? `${API_URL}${userProfile.avatarUrl}` : null}
              size={40}
              borderColor="#a78bfa"
              borderWidth={2}
            />
          </View>
          <View className="flex-1">
            <Text className="text-dark-text-primary font-semibold text-sm" numberOfLines={1}>
              {displayName}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
              <Text className="text-dark-text-tertiary text-xs">Online</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-1">
          <Animated.View style={muteButtonAnimatedStyle}>
            <Pressable
              onPress={handleToggleMute}
              onLongPress={handleMuteLongPress}
              onPressIn={() => startLongPress(handleMuteLongPress, 'mute')}
              onPressOut={cancelLongPress}
              onContextMenu={(e) => handleContextMenu(e, handleMuteLongPress)}
              className={`w-9 h-9 rounded-lg items-center justify-center ${isMuted
                ? 'bg-red-500/30 border border-red-500/50'
                : 'bg-dark-bg-elevated border border-dark-border-default'
                }`}
              style={{ cursor: Platform.OS === 'web' ? 'pointer' : undefined }}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={18}
                color={isMuted ? '#ef4444' : '#e8e8ed'}
              />
            </Pressable>
          </Animated.View>

          <Animated.View style={deafenButtonAnimatedStyle}>
            <Pressable
              onPress={handleToggleDeafen}
              onLongPress={handleDeafenLongPress}
              onPressIn={() => startLongPress(handleDeafenLongPress, 'deafen')}
              onPressOut={cancelLongPress}
              onContextMenu={(e) => handleContextMenu(e, handleDeafenLongPress)}
              className={`w-9 h-9 rounded-lg items-center justify-center ${isDeafened
                ? 'bg-red-500/30 border border-red-500/50'
                : 'bg-dark-bg-elevated border border-dark-border-default'
                }`}
              style={{ cursor: Platform.OS === 'web' ? 'pointer' : undefined }}
            >
              <Ionicons
                name={isDeafened ? 'volume-mute' : 'headset'}
                size={18}
                color={isDeafened ? '#ef4444' : '#e8e8ed'}
              />
            </Pressable>
          </Animated.View>

          <TouchableOpacity
            onPress={handleSettings}
            className="w-9 h-9 bg-dark-bg-elevated rounded-lg items-center justify-center border border-dark-border-default"
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={18} color="#e8e8ed" />
          </TouchableOpacity>
        </View>
      </View>

      <AudioDeviceMenu
        visible={showInputDeviceMenu}
        onClose={() => setShowInputDeviceMenu(false)}
        devices={inputDevices}
        selectedDeviceId={selectedInputDeviceId}
        onSelectDevice={async (deviceId) => {
          await selectInputDevice(deviceId)
          setShowInputDeviceMenu(false)
        }}
        deviceType="input"
        loading={devicesLoading}
      />

      <AudioDeviceMenu
        visible={showOutputDeviceMenu}
        onClose={() => setShowOutputDeviceMenu(false)}
        devices={outputDevices}
        selectedDeviceId={selectedOutputDeviceId}
        onSelectDevice={async (deviceId) => {
          await selectOutputDevice(deviceId)
          setShowOutputDeviceMenu(false)
        }}
        deviceType="output"
        loading={devicesLoading}
      />

      <AudioDeviceMenu
        visible={showVideoDeviceMenu}
        onClose={() => setShowVideoDeviceMenu(false)}
        devices={videoInputDevices as any}
        selectedDeviceId={audioDevicePreferences.selectedVideoInputDeviceId}
        onSelectDevice={async (deviceId) => {
          await selectVideoInputDevice(deviceId)
          setShowVideoDeviceMenu(false)
        }}
        deviceType="input"
        loading={devicesLoading}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onLogout={handleLogout}
      />
    </View>
  )
}
