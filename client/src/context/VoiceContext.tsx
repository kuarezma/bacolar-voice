import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { VoiceRoom, UserProfile, DirectCallSession, PeerAudioState, ChatMessage } from '../types';
import { audioController, AudioSettings, DEFAULT_AUDIO_SETTINGS } from '../audio/AudioController';
import { sounds } from '../audio/soundEffects';

interface VoiceContextType {
  currentRoom: VoiceRoom | null;
  roomMembers: UserProfile[];
  roomMessages: ChatMessage[];
  peerStates: Record<string, PeerAudioState>;
  myMicLevel: number;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  directCall: DirectCallSession | null;
  incomingCall: DirectCallSession | null;
  audioSettings: AudioSettings;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  joinVoiceRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveVoiceRoom: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  setUserVolume: (userId: string, volume: number) => void;
  sendRoomMessage: (text: string) => void;
  startDirectCall: (targetUserId: string) => void;
  acceptDirectCall: () => void;
  rejectDirectCall: () => void;
  endDirectCall: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [currentRoom, setCurrentRoom] = useState<VoiceRoom | null>(null);
  const [roomMembers, setRoomMembers] = useState<UserProfile[]>([]);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [peerStates, setPeerStates] = useState<Record<string, PeerAudioState>>({});

  const [myMicLevel, setMyMicLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [directCall, setDirectCall] = useState<DirectCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<DirectCallSession | null>(null);

  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => audioController.settings);

  // --- AUDIO CONTROLLER CALLBACKS ---
  useEffect(() => {
    audioController.setCallbacks({
      onLevelChange: (level) => {
        setMyMicLevel(level);
      },
      onSpeakingChange: (speaking, level) => {
        setIsSpeaking(speaking);
        if (socket && socket.connected) {
          socket.emit('speaking-state', { isSpeaking: speaking, audioLevel: level });
        }
      }
    });
  }, [socket]);

  useEffect(() => {
    const electronApi = window.electronAPI;
    if (!electronApi) return;

    return electronApi.onGlobalMuteToggle(() => {
      const nextMuted = audioController.toggleMute();
      setIsMuted(nextMuted);
      if (socket?.connected) {
        socket.emit('voice-mute-toggle', { micMuted: nextMuted });
      }
    });
  }, [socket]);

  const updateAudioSettings = (newSettings: Partial<AudioSettings>) => {
    audioController.saveSettings(newSettings);
    setAudioSettings({ ...audioController.settings });
  };

  // --- ODA VE WEBRTC YÖNETİMİ ---

  const joinVoiceRoom = useCallback(async (roomId: string, password?: string): Promise<boolean> => {
    if (!socket || !socket.connected) return false;

    // Mikrofonu başlat
    const localStream = await audioController.initLocalAudio();
    if (!localStream) {
      alert('Mikrofon başlatılamadı. Tarayıcı veya uygulama izinlerini ve seçili mikrofonu kontrol edin.');
      return false;
    }

    return new Promise((resolve) => {
      socket.emit('join-room', { roomId, password });

      const onJoined = async (data: { room: VoiceRoom; existingMembers: UserProfile[]; messages: ChatMessage[] }) => {
        socket.off('joined-room-success', onJoined);
        socket.off('join-room-error', onError);

        setCurrentRoom(data.room);
        setRoomMembers(data.room.members);
        setRoomMessages(data.messages || []);
        sounds.playJoinSound();

        // Odadaki mevcut her kullanıcı ile WebRTC PeerConnection başlat ve Offer gönder
        for (const peer of data.existingMembers) {
          setupPeerConnection(peer.id, data.room.id, true);
        }

        resolve(true);
      };

      const onError = (data: { message: string }) => {
        socket.off('joined-room-success', onJoined);
        socket.off('join-room-error', onError);
        alert(data.message || 'Odaya katılamadı.');
        resolve(false);
      };

      socket.on('joined-room-success', onJoined);
      socket.on('join-room-error', onError);
    });
  }, [socket]);

  const leaveVoiceRoom = useCallback(() => {
    if (socket && socket.connected && currentRoom) {
      socket.emit('leave-room');
    }
    audioController.closeAllPeers();
    setCurrentRoom(null);
    setRoomMembers([]);
    setRoomMessages([]);
    setPeerStates({});
    sounds.playLeaveSound();
  }, [socket, currentRoom]);

  // WebRTC Peer Connection Kurulumu
  const setupPeerConnection = (peerUserId: string, roomId: string, isInitiator: boolean) => {
    const pc = audioController.createPeerConnection(
      peerUserId,
      (candidate) => {
        socket?.emit('signal-ice', { toUserId: peerUserId, candidate, roomId });
      },
      (stream) => {
        console.log(`📡 Remote audio track received from peer: ${peerUserId}`);
      }
    );

    if (isInitiator) {
      // Offer oluştur
      audioController.createOffer(peerUserId).then((offer) => {
        if (offer) {
          socket?.emit('signal-offer', { toUserId: peerUserId, offer, roomId });
        }
      });
    }

    return pc;
  };

  // --- SOCKET SES VE ODA ETKİNLİKLERİ ---
  useEffect(() => {
    if (!socket) return;

    // Yeni kullanıcı odaya katıldı
    socket.on('user-joined-room', (data: { user: UserProfile; roomId: string }) => {
      setRoomMembers(prev => {
        if (prev.some(u => u.id === data.user.id)) return prev;
        return [...prev, data.user];
      });
      sounds.playJoinSound();
      // Gelen kullanıcı için peer hazırla (o bize offer atacak)
      setupPeerConnection(data.user.id, data.roomId, false);
    });

    // Kullanıcı odadan ayrıldı
    socket.on('user-left-room', (data: { userId: string; roomId: string }) => {
      setRoomMembers(prev => prev.filter(u => u.id !== data.userId));
      audioController.closePeerConnection(data.userId);
      setPeerStates(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      sounds.playLeaveSound();
    });

    // WebRTC Signaling
    socket.on('signal-offer', async (data: { fromUserId: string; offer: any; roomId: string }) => {
      setupPeerConnection(data.fromUserId, data.roomId, false);
      const answer = await audioController.handleOffer(data.fromUserId, data.offer);
      if (answer) {
        socket.emit('signal-answer', { toUserId: data.fromUserId, answer, roomId: data.roomId });
      }
    });

    socket.on('signal-answer', async (data: { fromUserId: string; answer: any }) => {
      await audioController.handleAnswer(data.fromUserId, data.answer);
    });

    socket.on('signal-ice', async (data: { fromUserId: string; candidate: any }) => {
      await audioController.addIceCandidate(data.fromUserId, data.candidate);
    });

    // Konuşma Durumu
    socket.on('user-speaking-state', (data: { userId: string; isSpeaking: boolean; audioLevel: number }) => {
      setPeerStates(prev => ({
        ...prev,
        [data.userId]: {
          ...(prev[data.userId] || { volume: 100, isMuted: false }),
          userId: data.userId,
          isSpeaking: data.isSpeaking,
          audioLevel: data.audioLevel
        }
      }));
    });

    // Mute/Deafen Değişimi
    socket.on('user-voice-state-changed', (data: { userId: string; micMuted: boolean; deafened: boolean }) => {
      setRoomMembers(prev => prev.map(m => m.id === data.userId ? { ...m, micMuted: data.micMuted, deafened: data.deafened } : m));
    });

    // Oda Mesajı
    socket.on('room-message-received', (data: { message: ChatMessage }) => {
      setRoomMessages(prev => [...prev, data.message]);
      sounds.playMessageSound();
    });

    // --- 1-1 DOĞRUDAN ARAMA ETKİNLİKLERİ ---
    socket.on('direct-call-incoming', (data: { session: DirectCallSession }) => {
      setIncomingCall(data.session);
      sounds.startIncomingCallTone();
    });

    socket.on('direct-call-outgoing', (data: { session: DirectCallSession }) => {
      setDirectCall(data.session);
    });

    socket.on('direct-call-accepted', async (data: { session: DirectCallSession }) => {
      sounds.stopIncomingCallTone();
      setIncomingCall(null);
      setDirectCall(data.session);

      const localStream = await audioController.initLocalAudio();
      if (!localStream) {
        socket.emit('end-direct-call', { callId: data.session.callId });
        alert('Mikrofon başlatılamadığı için arama sonlandırıldı. İzinleri ve seçili mikrofonu kontrol edin.');
        return;
      }

      const otherUserId = data.session.callerId === user?.id ? data.session.receiverId : data.session.callerId;
      const isInitiator = data.session.callerId === user?.id;

      audioController.createPeerConnection(
        otherUserId,
        (candidate) => {
          socket.emit('direct-signal-ice', { callId: data.session.callId, toUserId: otherUserId, candidate });
        },
        (stream) => {
          console.log('📡 Direct Call Audio Track Received');
        }
      );

      if (isInitiator) {
        const offer = await audioController.createOffer(otherUserId);
        if (offer) {
          socket.emit('direct-signal-offer', { callId: data.session.callId, toUserId: otherUserId, offer });
        }
      }
    });

    socket.on('direct-signal-offer', async (data: { callId: string; fromUserId: string; offer: any }) => {
      const answer = await audioController.handleOffer(data.fromUserId, data.offer);
      if (answer) {
        socket.emit('direct-signal-answer', { callId: data.callId, toUserId: data.fromUserId, answer });
      }
    });

    socket.on('direct-signal-answer', async (data: { fromUserId: string; answer: any }) => {
      await audioController.handleAnswer(data.fromUserId, data.answer);
    });

    socket.on('direct-signal-ice', async (data: { fromUserId: string; candidate: any }) => {
      await audioController.addIceCandidate(data.fromUserId, data.candidate);
    });

    socket.on('direct-call-rejected', () => {
      sounds.stopIncomingCallTone();
      setDirectCall(null);
      setIncomingCall(null);
      alert('Arama reddedildi.');
    });

    socket.on('direct-call-ended', () => {
      sounds.stopIncomingCallTone();
      setDirectCall(null);
      setIncomingCall(null);
      audioController.closeAllPeers();
    });

    socket.on('direct-call-failed', (data: { message: string }) => {
      sounds.stopIncomingCallTone();
      setDirectCall(null);
      alert(data.message || 'Arama başarısız oldu.');
    });

    socket.on('direct-call-error', (data: { message: string }) => {
      alert(data.message || 'Arama başlatılamadı.');
    });

    return () => {
      socket.off('user-joined-room');
      socket.off('user-left-room');
      socket.off('signal-offer');
      socket.off('signal-answer');
      socket.off('signal-ice');
      socket.off('user-speaking-state');
      socket.off('user-voice-state-changed');
      socket.off('room-message-received');
      socket.off('direct-call-incoming');
      socket.off('direct-call-outgoing');
      socket.off('direct-call-accepted');
      socket.off('direct-signal-offer');
      socket.off('direct-signal-answer');
      socket.off('direct-signal-ice');
      socket.off('direct-call-rejected');
      socket.off('direct-call-ended');
      socket.off('direct-call-failed');
      socket.off('direct-call-error');
    };
  }, [socket, user]);

  // --- KULLANICI SES KONTROLLERİ (MUTE, DEAFEN, SLIDER) ---

  const toggleMute = () => {
    const nextMuted = audioController.toggleMute();
    setIsMuted(nextMuted);
    if (socket && socket.connected) {
      socket.emit('voice-mute-toggle', { micMuted: nextMuted });
    }
  };

  const toggleDeafen = () => {
    const nextDeafened = audioController.toggleDeafen();
    setIsDeafened(nextDeafened);
    if (nextDeafened) setIsMuted(true);
    if (socket && socket.connected) {
      socket.emit('voice-deafen-toggle', { deafened: nextDeafened });
    }
  };

  const setUserVolume = (userId: string, volume: number) => {
    audioController.setUserVolume(userId, volume);
    setPeerStates(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { isSpeaking: false, audioLevel: 0, isMuted: false }),
        userId,
        volume
      }
    }));
  };

  const sendRoomMessage = (text: string) => {
    if (socket && currentRoom && text.trim()) {
      socket.emit('send-room-message', { roomId: currentRoom.id, text: text.trim() });
    }
  };

  const startDirectCall = (targetUserId: string) => {
    if (socket) {
      socket.emit('start-direct-call', { targetUserId });
    }
  };

  const acceptDirectCall = () => {
    if (socket && incomingCall) {
      socket.emit('accept-direct-call', { callId: incomingCall.callId });
    }
  };

  const rejectDirectCall = () => {
    if (socket && incomingCall) {
      socket.emit('reject-direct-call', { callId: incomingCall.callId });
      sounds.stopIncomingCallTone();
      setIncomingCall(null);
    }
  };

  const endDirectCall = () => {
    if (socket && directCall) {
      socket.emit('end-direct-call', { callId: directCall.callId });
      sounds.stopIncomingCallTone();
      setDirectCall(null);
      audioController.closeAllPeers();
    }
  };

  // --- BAS-KONUŞ (PUSH-TO-TALK) GLOBAL KLAVYE DİNLEYİCİSİ ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Eğer input/textarea içindeyse tetikleme
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === audioSettings.pttKey && audioSettings.inputMode === 'push_to_talk') {
        if (!e.repeat) {
          audioController.setPttActive(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === audioSettings.pttKey && audioSettings.inputMode === 'push_to_talk') {
        audioController.setPttActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioSettings.pttKey, audioSettings.inputMode]);

  return (
    <VoiceContext.Provider
      value={{
        currentRoom,
        roomMembers,
        roomMessages,
        peerStates,
        myMicLevel,
        isMuted,
        isDeafened,
        isSpeaking,
        directCall,
        incomingCall,
        audioSettings,
        updateAudioSettings,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleMute,
        toggleDeafen,
        setUserVolume,
        sendRoomMessage,
        startDirectCall,
        acceptDirectCall,
        rejectDirectCall,
        endDirectCall
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used within a VoiceProvider');
  return context;
};
