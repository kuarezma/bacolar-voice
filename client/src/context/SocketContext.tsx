import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { UserProfile, VoiceRoom, FriendRequest } from '../types';
import { sounds } from '../audio/soundEffects';
import { loadIceServers } from '../audio/AudioController';
import { getServerUrl, getServerToken } from '../config/server';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  ping: number;
  rooms: VoiceRoom[];
  friends: UserProfile[];
  friendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  createRoom: (name: string, category: VoiceRoom['category'], options?: { maxUsers?: number; isPrivate?: boolean; password?: string; gameTitle?: string }) => void;
  sendFriendRequest: (username: string, tag: string) => Promise<{ success: boolean; message: string }>;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  removeFriend: (friendId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [ping, setPing] = useState(12);
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({
    incoming: [],
    outgoing: []
  });

  const pingIntervalRef = useRef<any>(null);

  useEffect(() => {
    const s = io(getServerUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: { token: getServerToken() }
    });

    s.on('connect_error', (error: Error) => {
      setIsConnected(false);
      setConnectionError(
        error.message === 'invalid-server-token'
          ? 'Sunucu şifresi geçersiz. Oyuncu Profili ayarlarından doğru şifreyi girin.'
          : `Sunucuya bağlanılamadı (${getServerUrl()}). Adresi ve sunucunun açık olduğunu kontrol edin.`
      );
    });

    s.on('auth-error', (data: { reason: string }) => {
      setConnectionError(
        data.reason === 'already-connected'
          ? 'Bu hesap başka bir cihazda açık. Diğer oturumu kapatıp yeniden deneyin.'
          : 'Kimlik doğrulaması başarısız oldu.'
      );
    });

    s.on('connect', () => {
      console.log('✅ Connected to BacolarVoice Server');
      setIsConnected(true);
      setConnectionError(null);
      void loadIceServers();

      if (user) {
        s.emit('authenticate', {
          userId: user.id,
          username: user.username,
          tag: user.tag,
          avatar: user.avatar
        });
      }
    });

    s.on('disconnect', () => {
      console.warn('❌ Disconnected from BacolarVoice Server');
      setIsConnected(false);
    });

    s.on('auth-success', (data: { user: UserProfile }) => {
      updateProfile(data.user);
    });

    s.on('rooms-sync', (data: { rooms: VoiceRoom[] }) => {
      setRooms(data.rooms);
    });

    s.on('friends-sync', (data: { friends: UserProfile[]; requests: { incoming: FriendRequest[]; outgoing: FriendRequest[] } }) => {
      setFriends(data.friends || []);
      setFriendRequests(data.requests || { incoming: [], outgoing: [] });
    });

    s.on('new-friend-request', (data: { request: FriendRequest }) => {
      sounds.playMessageSound();
    });

    s.on('friend-status-updated', (data: { userId: string; status: UserProfile['status']; customStatus?: string; currentGame?: string }) => {
      setFriends(prev => prev.map(f => {
        if (f.id === data.userId) {
          return { ...f, status: data.status, customStatus: data.customStatus, currentGame: data.currentGame };
        }
        return f;
      }));
    });

    setSocket(s);

    // Ping ölçüm döngüsü
    pingIntervalRef.current = setInterval(() => {
      if (s.connected) {
        const start = Date.now();
        s.emit('ping', () => {
          const latency = Date.now() - start;
          setPing(Math.max(4, latency));
        });
      }
    }, 4000);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      s.disconnect();
    };
  }, []);

  // Profil değiştiğinde sunucuya bildir
  useEffect(() => {
    if (socket && socket.connected && user) {
      socket.emit('update-profile', {
        username: user.username,
        tag: user.tag,
        avatar: user.avatar,
        status: user.status,
        customStatus: user.customStatus,
        currentGame: user.currentGame
      });
    }
  }, [user?.username, user?.tag, user?.avatar, user?.status, user?.customStatus, user?.currentGame]);

  const createRoom = (name: string, category: VoiceRoom['category'], options?: { maxUsers?: number; isPrivate?: boolean; password?: string; gameTitle?: string }) => {
    if (socket) {
      socket.emit('create-room', { name, category, ...options });
    }
  };

  const sendFriendRequest = (username: string, tag: string): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ success: false, message: 'Sunucuya bağlı değilsiniz.' });

      socket.emit('send-friend-request', { targetUsername: username, targetTag: tag });

      const handleResponse = (res: { success: boolean; message: string }) => {
        socket.off('friend-request-response', handleResponse);
        resolve(res);
      };

      socket.on('friend-request-response', handleResponse);

      setTimeout(() => {
        socket.off('friend-request-response', handleResponse);
        resolve({ success: false, message: 'İstek zaman aşımına uğradı.' });
      }, 5000);
    });
  };

  const acceptFriendRequest = (requestId: string) => {
    if (socket) {
      socket.emit('accept-friend-request', { requestId });
    }
  };

  const rejectFriendRequest = (requestId: string) => {
    if (socket) {
      socket.emit('reject-friend-request', { requestId });
    }
  };

  const removeFriend = (friendId: string) => {
    if (socket) {
      socket.emit('remove-friend', { friendId });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionError,
        ping,
        rooms,
        friends,
        friendRequests,
        createRoom,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
