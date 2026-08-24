export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface UserProfile {
  id: string;
  username: string;
  tag: string; // e.g. "1337"
  avatar: string; // avatar url or preset id
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
  bitrate?: number; // kbps, default 128
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
