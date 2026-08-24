import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { store } from './store';
import { UserProfile } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Socket ID -> User ID eşleşmesi
const socketToUser = new Map<string, string>();
// User ID -> Socket ID eşleşmesi
const userToSocket = new Map<string, string>();

// --- REST ENDPOINTS ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), usersCount: store.getAllRooms().length });
});

app.post('/api/auth/login', (req, res) => {
  const { username, tag, avatar } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Kullanıcı adı gereklidir.' });
  }

  const user = store.getOrCreateUser(username, tag, avatar);
  res.json({ user });
});

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: store.getAllRooms() });
});

app.get('/api/users/search', (req, res) => {
  const { username, tag } = req.query;
  if (typeof username !== 'string' || typeof tag !== 'string') {
    return res.status(400).json({ error: 'Kullanıcı adı ve etiket gereklidir.' });
  }

  const user = store.findUserByUsernameAndTag(username, tag);
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  // Güvenli profil döndür
  res.json({
    user: {
      id: user.id,
      username: user.username,
      tag: user.tag,
      avatar: user.avatar,
      status: user.status,
      currentGame: user.currentGame
    }
  });
});

// --- SOCKET.IO EVENTS ---

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Kullanıcı kimlik doğrulama & çevrimiçi olma
  socket.on('authenticate', (userData: { userId: string; username: string; tag?: string; avatar?: string }) => {
    let user = store.getUser(userData.userId);
    if (!user) {
      user = store.getOrCreateUser(userData.username, userData.tag, userData.avatar);
    }

    socketToUser.set(socket.id, user.id);
    userToSocket.set(user.id, socket.id);
    store.setUserSocket(user.id, socket.id, 'online');

    socket.emit('auth-success', { user });

    // Arkadaş listesini ve bekleyen istekleri gönder
    const friends = store.getFriends(user.id);
    const requests = store.getPendingRequests(user.id);
    socket.emit('friends-sync', { friends, requests });

    // Odaları gönder
    socket.emit('rooms-sync', { rooms: store.getAllRooms() });

    // Arkadaşlarına "Online oldu" bildirimi gönder
    for (const friend of friends) {
      const friendSocketId = userToSocket.get(friend.id);
      if (friendSocketId) {
        io.to(friendSocketId).emit('friend-status-updated', {
          userId: user.id,
          status: 'online',
          customStatus: user.customStatus,
          currentGame: user.currentGame
        });
      }
    }
  });

  // Profil & Durum Güncelleme
  socket.on('update-profile', (updates: Partial<UserProfile>) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const updated = store.updateUser(userId, updates);
    if (updated) {
      socket.emit('profile-updated', { user: updated });

      // Arkadaşlarına durum güncellemesini ilet
      const friends = store.getFriends(userId);
      for (const friend of friends) {
        const friendSocketId = userToSocket.get(friend.id);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend-status-updated', {
            userId: updated.id,
            status: updated.status,
            customStatus: updated.customStatus,
            currentGame: updated.currentGame
          });
        }
      }

      // Eğer bir odadaysa odadakilere bildir
      if (updated.currentRoomId) {
        io.to(updated.currentRoomId).emit('room-member-updated', { user: updated });
      }
    }
  });

  // --- SES ODALARI ---

  socket.on('create-room', (data: { name: string; category: any; maxUsers?: number; isPrivate?: boolean; password?: string; gameTitle?: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const room = store.createRoom(data.name, data.category, userId, data);
    io.emit('room-created', { room });
    socket.emit('room-created-success', { room });
  });

  socket.on('join-room', (data: { roomId: string; password?: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = store.getUser(userId);
    if (!user) return;

    const targetRoom = store.getRoom(data.roomId);
    if (!targetRoom) {
      return socket.emit('join-room-error', { message: 'Oda bulunamadı.' });
    }

    if (targetRoom.isPrivate && targetRoom.password && targetRoom.password !== data.password) {
      return socket.emit('join-room-error', { message: 'Geçersiz oda şifresi.' });
    }

    // Eski odadan ayrıl
    if (user.currentRoomId && user.currentRoomId !== data.roomId) {
      socket.leave(user.currentRoomId);
      io.to(user.currentRoomId).emit('user-left-room', { userId: user.id, roomId: user.currentRoomId });
      store.leaveCurrentRoom(user.id);
    }

    const res = store.joinRoom(data.roomId, user);
    if (!res.success || !res.room) {
      return socket.emit('join-room-error', { message: res.message || 'Odaya katılamadı.' });
    }

    socket.join(data.roomId);

    // Odaya yeni katılan kullanıcıya, odadaki mevcut diğer kullanıcıları gönder (WebRTC mesh için)
    const otherMembers = res.room.members.filter(m => m.id !== user.id);
    socket.emit('joined-room-success', {
      room: res.room,
      existingMembers: otherMembers,
      messages: store.getRoomMessages(data.roomId)
    });

    // Odadaki diğer kullanıcılara yeni üyenin geldiğini bildir
    socket.to(data.roomId).emit('user-joined-room', {
      user,
      roomId: data.roomId
    });

    // Tüm sunucuya oda durumunu güncelle
    io.emit('rooms-sync', { rooms: store.getAllRooms() });
  });

  socket.on('leave-room', () => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = store.getUser(userId);
    if (!user || !user.currentRoomId) return;

    const roomId = user.currentRoomId;
    socket.leave(roomId);
    store.leaveCurrentRoom(userId);

    io.to(roomId).emit('user-left-room', { userId, roomId });
    socket.emit('left-room-success', { roomId });
    io.emit('rooms-sync', { rooms: store.getAllRooms() });
  });

  // --- WEBRTC SES SİNYALLEŞMESİ (ROOM MESH) ---

  socket.on('signal-offer', (data: { toUserId: string; offer: any; roomId: string }) => {
    const fromUserId = socketToUser.get(socket.id);
    if (!fromUserId) return;

    const targetSocketId = userToSocket.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal-offer', {
        fromUserId,
        offer: data.offer,
        roomId: data.roomId
      });
    }
  });

  socket.on('signal-answer', (data: { toUserId: string; answer: any; roomId: string }) => {
    const fromUserId = socketToUser.get(socket.id);
    if (!fromUserId) return;

    const targetSocketId = userToSocket.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal-answer', {
        fromUserId,
        answer: data.answer,
        roomId: data.roomId
      });
    }
  });

  socket.on('signal-ice', (data: { toUserId: string; candidate: any; roomId: string }) => {
    const fromUserId = socketToUser.get(socket.id);
    if (!fromUserId) return;

    const targetSocketId = userToSocket.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal-ice', {
        fromUserId,
        candidate: data.candidate,
        roomId: data.roomId
      });
    }
  });

  // --- SES DURUMU (Speaking, Mute, Deafen) ---

  socket.on('speaking-state', (data: { isSpeaking: boolean; audioLevel: number }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = store.getUser(userId);
    if (user && user.currentRoomId) {
      socket.to(user.currentRoomId).emit('user-speaking-state', {
        userId,
        isSpeaking: data.isSpeaking,
        audioLevel: data.audioLevel
      });
    }
  });

  socket.on('voice-mute-toggle', (data: { micMuted: boolean }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const updated = store.updateUser(userId, { micMuted: data.micMuted });
    if (updated && updated.currentRoomId) {
      io.to(updated.currentRoomId).emit('user-voice-state-changed', {
        userId,
        micMuted: updated.micMuted,
        deafened: updated.deafened
      });
    }
  });

  socket.on('voice-deafen-toggle', (data: { deafened: boolean }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    // Sağırlaştırıldığında mikrofon da otomatik kapanır
    const micMuted = data.deafened ? true : undefined;
    const updated = store.updateUser(userId, {
      deafened: data.deafened,
      ...(micMuted !== undefined ? { micMuted } : {})
    });

    if (updated && updated.currentRoomId) {
      io.to(updated.currentRoomId).emit('user-voice-state-changed', {
        userId,
        micMuted: updated.micMuted,
        deafened: updated.deafened
      });
    }
  });

  // --- ODA İÇİ MESAJLAŞMA ---

  socket.on('send-room-message', (data: { roomId: string; text: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const msg = store.addMessage(data.roomId, userId, data.text);
    if (msg) {
      io.to(data.roomId).emit('room-message-received', { message: msg });
    }
  });

  // --- ARKADAŞLIK SİSTEMİ ---

  socket.on('send-friend-request', (data: { targetUsername: string; targetTag: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const targetUser = store.findUserByUsernameAndTag(data.targetUsername, data.targetTag);
    if (!targetUser) {
      return socket.emit('friend-request-response', { success: false, message: 'Oyuncu bulunamadı. Kullanıcı adı ve etiketi kontrol edin.' });
    }

    const res = store.sendFriendRequest(userId, targetUser.id);
    socket.emit('friend-request-response', res);

    if (res.success && res.request) {
      // Hedef kullanıcının socket'i varsa ona bildirim at
      const targetSocketId = userToSocket.get(targetUser.id);
      if (targetSocketId) {
        io.to(targetSocketId).emit('new-friend-request', { request: res.request });
        const targetReqs = store.getPendingRequests(targetUser.id);
        const targetFriends = store.getFriends(targetUser.id);
        io.to(targetSocketId).emit('friends-sync', { friends: targetFriends, requests: targetReqs });
      }

      const myReqs = store.getPendingRequests(userId);
      const myFriends = store.getFriends(userId);
      socket.emit('friends-sync', { friends: myFriends, requests: myReqs });
    }
  });

  socket.on('accept-friend-request', (data: { requestId: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const res = store.acceptFriendRequest(data.requestId, userId);
    if (res.success && res.friendId) {
      // Her iki tarafa da güncel listeleri gönder
      const myFriends = store.getFriends(userId);
      const myReqs = store.getPendingRequests(userId);
      socket.emit('friends-sync', { friends: myFriends, requests: myReqs });

      const friendSocketId = userToSocket.get(res.friendId);
      if (friendSocketId) {
        const friendFriends = store.getFriends(res.friendId);
        const friendReqs = store.getPendingRequests(res.friendId);
        io.to(friendSocketId).emit('friends-sync', { friends: friendFriends, requests: friendReqs });
      }
    }
  });

  socket.on('reject-friend-request', (data: { requestId: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    store.rejectFriendRequest(data.requestId, userId);
    const myReqs = store.getPendingRequests(userId);
    socket.emit('friends-sync', { friends: store.getFriends(userId), requests: myReqs });
  });

  socket.on('remove-friend', (data: { friendId: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    store.removeFriend(userId, data.friendId);
    socket.emit('friends-sync', { friends: store.getFriends(userId), requests: store.getPendingRequests(userId) });

    const friendSocketId = userToSocket.get(data.friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit('friends-sync', {
        friends: store.getFriends(data.friendId),
        requests: store.getPendingRequests(data.friendId)
      });
    }
  });

  // --- 1-1 DOĞRUDAN SESLİ ARAMA (DIRECT CALL) ---

  socket.on('start-direct-call', (data: { targetUserId: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const session = store.startCall(userId, data.targetUserId);
    if (!session) {
      return socket.emit('direct-call-error', { message: 'Kullanıcı meşgul veya bulunamadı.' });
    }

    socket.emit('direct-call-outgoing', { session });

    const targetSocketId = userToSocket.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('direct-call-incoming', { session });
    } else {
      socket.emit('direct-call-failed', { message: 'Kullanıcı şu anda çevrimdışı.' });
      store.endCall(session.callId);
    }
  });

  socket.on('accept-direct-call', (data: { callId: string }) => {
    const userId = socketToUser.get(socket.id);
    const session = store.getCall(data.callId);
    if (!session || session.receiverId !== userId) return;

    session.status = 'connected';
    const callerSocket = userToSocket.get(session.callerId);
    if (callerSocket) {
      io.to(callerSocket).emit('direct-call-accepted', { session });
    }
    socket.emit('direct-call-accepted', { session });
  });

  socket.on('reject-direct-call', (data: { callId: string }) => {
    const session = store.endCall(data.callId);
    if (session) {
      const callerSocket = userToSocket.get(session.callerId);
      if (callerSocket) {
        io.to(callerSocket).emit('direct-call-rejected', { callId: data.callId });
      }
    }
  });

  socket.on('end-direct-call', (data: { callId: string }) => {
    const session = store.endCall(data.callId);
    if (session) {
      const callerSocket = userToSocket.get(session.callerId);
      const receiverSocket = userToSocket.get(session.receiverId);
      if (callerSocket) io.to(callerSocket).emit('direct-call-ended', { callId: data.callId });
      if (receiverSocket) io.to(receiverSocket).emit('direct-call-ended', { callId: data.callId });
    }
  });

  // 1-1 WebRTC Direct Call Signaling
  socket.on('direct-signal-offer', (data: { callId: string; toUserId: string; offer: any }) => {
    const fromUserId = socketToUser.get(socket.id);
    const targetSocketId = userToSocket.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('direct-signal-offer', {
        callId: data.callId,
        fromUserId,
        offer: data.offer
      });
    }
  });

  socket.on('direct-signal-answer', (data: { callId: string; toUserId: string; answer: any }) => {
    const fromUserId = socketToUser.get(socket.id);
    const targetSocketId = userToSocket.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('direct-signal-answer', {
        callId: data.callId,
        fromUserId,
        answer: data.answer
      });
    }
  });

  socket.on('direct-signal-ice', (data: { callId: string; toUserId: string; candidate: any }) => {
    const fromUserId = socketToUser.get(socket.id);
    const targetSocketId = userToSocket.get(data.toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('direct-signal-ice', {
        callId: data.callId,
        fromUserId,
        candidate: data.candidate
      });
    }
  });

  // --- KOPMA (DISCONNECT) ---

  socket.on('disconnect', () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      const user = store.getUser(userId);
      if (user) {
        if (user.currentRoomId) {
          const roomId = user.currentRoomId;
          store.leaveCurrentRoom(userId);
          socket.to(roomId).emit('user-left-room', { userId, roomId });
          io.emit('rooms-sync', { rooms: store.getAllRooms() });
        }

        store.setUserSocket(userId, undefined, 'offline');

        // Arkadaşlarına "Offline oldu" bildirimi
        const friends = store.getFriends(userId);
        for (const friend of friends) {
          const friendSocketId = userToSocket.get(friend.id);
          if (friendSocketId) {
            io.to(friendSocketId).emit('friend-status-updated', {
              userId,
              status: 'offline'
            });
          }
        }
      }

      userToSocket.delete(userId);
      socketToUser.delete(socket.id);
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 NexusVoice Signaling Server running on http://localhost:${PORT}`);
});
