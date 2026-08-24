export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface UserProfile {
  id: string;
  username: string;
  tag: string;
  avatar: string;
  status: UserStatus;
  customStatus?: string;
  currentGame?: string;
  micMuted: boolean;
  deafened: boolean;
  currentRoomId?: string;
  socketId?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUser: UserProfile;
  toUser: UserProfile;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface VoiceRoom {
  id: string;
  name: string;
  category: 'Gaming' | 'Casual' | 'Duo' | 'Competitive' | 'Custom';
  gameTitle?: string;
  maxUsers: number;
  isPrivate: boolean;
  password?: string;
  createdBy: string;
  members: UserProfile[];
  bitrate?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
}

export interface DirectCallSession {
  callId: string;
  callerId: string;
  receiverId: string;
  caller: UserProfile;
  receiver: UserProfile;
  status: 'ringing' | 'connected' | 'ended' | 'rejected';
  startedAt?: number;
}

export interface PeerAudioState {
  userId: string;
  isSpeaking: boolean;
  audioLevel: number;
  volume: number; // 0 - 200%
  isMuted: boolean;
}
