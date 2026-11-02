import type { ViewStyle } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

type IconProps = {
  size?: number;
  color?: string;
  style?: ViewStyle;
};

// App branding icons
export const DiscordIcon = ({ size = 24, color = 'white', style }: IconProps) => (
  <AntDesign name="discord" size={size} color={color} style={style} />
);

// Channel type icons
export const TextChannelIcon = ({ size = 18, color = '#94a3b8', style }: IconProps) => (
  <Feather name="hash" size={size} color={color} style={style} />
);

export const VoiceChannelIcon = ({ size = 18, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="volume-medium" size={size} color={color} style={style} />
);

// Action icons
export const AddIcon = ({ size = 20, color = '#e2e8f0', style }: IconProps) => (
  <AntDesign name="plus" size={size} color={color} style={style} />
);

export const SettingsIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="settings-outline" size={size} color={color} style={style} />
);

export const EditIcon = ({ size = 18, color = '#94a3b8', style }: IconProps) => (
  <Feather name="edit-2" size={size} color={color} style={style} />
);

export const DeleteIcon = ({ size = 18, color = '#ef4444', style }: IconProps) => (
  <Feather name="trash-2" size={size} color={color} style={style} />
);

export const MoreIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Feather name="more-horizontal" size={size} color={color} style={style} />
);

export const MoreVerticalIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Feather name="more-vertical" size={size} color={color} style={style} />
);

export const CloseIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <AntDesign name="close" size={size} color={color} style={style} />
);

export const CheckIcon = ({ size = 20, color = '#10b981', style }: IconProps) => (
  <AntDesign name="check" size={size} color={color} style={style} />
);

// Navigation icons
export const BackIcon = ({ size = 20, color = '#e2e8f0', style }: IconProps) => (
  <Ionicons name="chevron-back" size={size} color={color} style={style} />
);

export const ChevronDownIcon = ({ size = 16, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="chevron-down" size={size} color={color} style={style} />
);

export const ChevronRightIcon = ({ size = 16, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="chevron-forward" size={size} color={color} style={style} />
);

// Member & User icons
export const MemberIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="people-outline" size={size} color={color} style={style} />
);

export const UserIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="person-outline" size={size} color={color} style={style} />
);

export const LogoutIcon = ({ size = 20, color = '#ef4444', style }: IconProps) => (
  <Ionicons name="log-out-outline" size={size} color={color} style={style} />
);

// Message & Communication icons
export const SendIcon = ({ size = 20, color = '#60a5fa', style }: IconProps) => (
  <Ionicons name="send" size={size} color={color} style={style} />
);

export const EmojiIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="happy-outline" size={size} color={color} style={style} />
);

export const AttachIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="attach" size={size} color={color} style={style} />
);

export const ImageIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="image-outline" size={size} color={color} style={style} />
);

// Status icons
export const OnlineIcon = ({ size = 12, color = '#10b981', style }: IconProps) => (
  <MaterialCommunityIcons name="circle" size={size} color={color} style={style} />
);

export const OfflineIcon = ({ size = 12, color = '#6b7280', style }: IconProps) => (
  <MaterialCommunityIcons name="circle-outline" size={size} color={color} style={style} />
);

export const SearchIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="search" size={size} color={color} style={style} />
);

export const BellIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="notifications-outline" size={size} color={color} style={style} />
);

export const PinIcon = ({ size = 18, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="pin-outline" size={size} color={color} style={style} />
);

export const LockIcon = ({ size = 18, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="lock-closed-outline" size={size} color={color} style={style} />
);

export const UnlockIcon = ({ size = 18, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="lock-open-outline" size={size} color={color} style={style} />
);

// Direct Messages icon
export const DirectMessagesIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="chatbubbles-outline" size={size} color={color} style={style} />
);

// Voice/Video call icons
export const MicIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="mic" size={size} color={color} style={style} />
);

export const MicOffIcon = ({ size = 20, color = '#ef4444', style }: IconProps) => (
  <Ionicons name="mic-off" size={size} color={color} style={style} />
);

export const VideoIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <Ionicons name="videocam" size={size} color={color} style={style} />
);

export const VideoOffIcon = ({ size = 20, color = '#ef4444', style }: IconProps) => (
  <Ionicons name="videocam-off" size={size} color={color} style={style} />
);

export const SubtitlesIcon = ({ size = 20, color = '#94a3b8', style }: IconProps) => (
  <MaterialCommunityIcons name="closed-caption" size={size} color={color} style={style} />
);

export const SubtitlesOffIcon = ({ size = 20, color = '#ef4444', style }: IconProps) => (
  <MaterialCommunityIcons name="closed-caption-outline" size={size} color={color} style={style} />
);