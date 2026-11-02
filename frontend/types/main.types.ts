export type Server = {
  id: number;
  name: string;
  ownerId: number;
  imageUrl?: string | null;
};

export type Channel = {
  id: number;
  name: string;
  type: 'text' | 'voice';
  serverId: number;
};

export type Member = {
  id: number;
  name: string | null;
  email?: string;
  avatarUrl?: string | null;
};

export type VoiceMemberWithAvatar = {
  userId: string;
  peerId: string;
  name?: string;
  avatarUrl?: string | null;
};

export type VoiceMembersMap = Map<number, VoiceMemberWithAvatar[]>;
