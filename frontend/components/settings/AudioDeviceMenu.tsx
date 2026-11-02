import { useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'

export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

interface AudioDeviceMenuProps {
  visible: boolean
  onClose: () => void
  devices: AudioDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  deviceType: 'input' | 'output'
  position?: { x: number; y: number }
  loading?: boolean
}

export function AudioDeviceMenu({
  visible,
  onClose,
  devices,
  selectedDeviceId,
  onSelectDevice,
  deviceType,
  position,
  loading = false,
}: AudioDeviceMenuProps) {
  const backdropOpacity = useSharedValue(0)
  const menuTranslateY = useSharedValue(50)
  const menuScale = useSharedValue(0.95)
  const menuOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 })
      menuTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      })
      menuScale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
      })
      menuOpacity.value = withTiming(1, { duration: 250 })
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 })
      menuTranslateY.value = withTiming(50, {
        duration: 200,
        easing: Easing.bezier(0.4, 0, 1, 1),
      })
      menuScale.value = withTiming(0.95, {
        duration: 200,
        easing: Easing.bezier(0.4, 0, 1, 1),
      })
      menuOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [visible])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const menuStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: menuTranslateY.value },
      { scale: menuScale.value },
    ],
    opacity: menuOpacity.value,
  }))

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onClose()
  }

  const handleSelectDevice = (deviceId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onSelectDevice(deviceId)
    setTimeout(() => {
      onClose()
    }, 150)
  }

  const getDeviceIcon = (device: AudioDevice) => {
    const label = device.label.toLowerCase()

    if (device.kind === 'audioinput') {
      if (label.includes('airpods') || label.includes('bluetooth')) {
        return 'bluetooth-audio'
      }
      if (label.includes('headset') || label.includes('headphone')) {
        return 'headset'
      }
      return 'mic'
    } else {
      if (label.includes('airpods') || label.includes('bluetooth')) {
        return 'bluetooth-audio'
      }
      if (label.includes('headset') || label.includes('headphone')) {
        return 'headset'
      }
      if (label.includes('speaker')) {
        return 'volume-up'
      }
      return 'volume-high'
    }
  }

  const getDeviceLabel = (device: AudioDevice) => {
    let label = device.label || 'Unknown Device'

    label = label.replace(/\s*\(.*?\)\s*/g, '')
    label = label.replace(/^(Default - |Default )/i, '')

    if (label.includes('Built-in')) {
      if (device.kind === 'audioinput') return 'Built-in Microphone'
      if (device.kind === 'audiooutput') return 'Built-in Speakers'
    }

    return label
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={handleClose}
        className="flex-1"
        style={{ backgroundColor: 'transparent' }}
      >
        <Animated.View
          style={[backdropStyle]}
          className="flex-1 bg-black/60"
        />
      </Pressable>

      <View className="absolute inset-0 justify-center items-center px-6 pointer-events-none">
        <Animated.View
          style={[menuStyle]}
          className="w-full max-w-sm pointer-events-auto"
        >
          {Platform.OS === 'ios' || Platform.OS === 'android' ? (
            <BlurView
              intensity={80}
              tint="dark"
              className="rounded-2xl overflow-hidden border border-white/20"
            >
              <MenuContent
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={handleSelectDevice}
                deviceType={deviceType}
                getDeviceIcon={getDeviceIcon}
                getDeviceLabel={getDeviceLabel}
                loading={loading}
              />
            </BlurView>
          ) : (
            <View className="bg-black/80 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/20">
              <MenuContent
                devices={devices}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={handleSelectDevice}
                deviceType={deviceType}
                getDeviceIcon={getDeviceIcon}
                getDeviceLabel={getDeviceLabel}
                loading={loading}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

function MenuContent({
  devices,
  selectedDeviceId,
  onSelectDevice,
  deviceType,
  getDeviceIcon,
  getDeviceLabel,
  loading,
}: {
  devices: AudioDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  deviceType: 'input' | 'output'
  getDeviceIcon: (device: AudioDevice) => any
  getDeviceLabel: (device: AudioDevice) => string
  loading: boolean
}) {
  return (
    <View className="p-4">
      <View className="mb-4">
        <Text className="text-white font-bold text-lg mb-1">
          {deviceType === 'input' ? 'Microphone' : 'Audio Output'}
        </Text>
        <Text className="text-gray-400 text-sm">
          Select your preferred {deviceType === 'input' ? 'input' : 'output'} device
        </Text>
      </View>

      <ScrollView
        className="max-h-80"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="py-8 items-center">
            <MaterialIcons name="hourglass-empty" size={32} color="#9ca3af" />
            <Text className="text-gray-400 text-sm mt-2">Loading devices...</Text>
          </View>
        ) : devices.length === 0 ? (
          <View className="py-8 items-center">
            <Ionicons name="warning-outline" size={32} color="#9ca3af" />
            <Text className="text-gray-400 text-sm mt-2">No devices available</Text>
            <Text className="text-gray-500 text-xs mt-1 text-center px-4">
              Make sure you have granted microphone permissions
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {devices.map((device, index) => {
              const isSelected = device.deviceId === selectedDeviceId
              return (
                <DeviceListItem
                  key={device.deviceId || `device-${index}`}
                  device={device}
                  isSelected={isSelected}
                  onSelect={() => onSelectDevice(device.deviceId)}
                  icon={getDeviceIcon(device)}
                  label={getDeviceLabel(device)}
                />
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function DeviceListItem({
  device,
  isSelected,
  onSelect,
  icon,
  label,
}: {
  device: AudioDevice
  isSelected: boolean
  onSelect: () => void
  icon: string
  label: string
}) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withTiming(0.97, {
      duration: 100,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 200,
    })
  }

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`flex-row items-center p-4 rounded-xl ${isSelected
            ? 'bg-purple-500/30 border border-purple-500/50'
            : 'bg-white/5 border border-white/10'
          }`}
        activeOpacity={0.8}
      >

        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isSelected ? 'bg-purple-500/40' : 'bg-white/10'
            }`}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={isSelected ? '#a855f7' : '#ffffff'}
          />
        </View>

        <Text
          className={`flex-1 font-medium ${isSelected ? 'text-purple-300' : 'text-white'
            }`}
          numberOfLines={2}
        >
          {label}
        </Text>

        {isSelected && (
          <View className="w-6 h-6 bg-purple-500 rounded-full items-center justify-center ml-2">
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}
