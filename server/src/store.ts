import fs from 'fs';
import path from 'path';
import { UserProfile, FriendRequest, VoiceRoom, ChatMessage, DirectCallSession } from './types';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(__dirname, '../data.json');

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  friendships: Record<string, string[]>; // userId -> friendUserIds[]
  friendRequests: FriendRequest[];
  rooms: VoiceRoom[];
}

export class DataStore {
  private users: Map<string, UserProfile> = new Map();
  private friendships: Map<string, Set<string>> = new Map();
  private friendRequests: FriendRequest[] = [];
  private rooms: Map<string, VoiceRoom> = new Map();
  private roomMessages: Map<string, ChatMessage[]> = new Map();
  private activeCalls: Map<string, DirectCallSession> = new Map();

  constructor() {
    this.initDefaultRooms();
    this.loadFromDisk();
  }

  private initDefaultRooms() {
    const defaultRooms: VoiceRoom[] = [
      {
        id: 'room-cs2',
        name: '🎯 CS2 Rekabetçi',
        category: 'Competitive',
        gameTitle: 'Counter-Strike 2',
        maxUsers: 5,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 128
      },
      {
        id: 'room-valorant',
        name: '🔥 Valorant 5-Stack',
        category: 'Competitive',
        gameTitle: 'Valorant',
        maxUsers: 5,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 128
      },
      {
        id: 'room-lol',
        name: '⚔️ League of Legends',
        category: 'Gaming',
        gameTitle: 'League of Legends',
        maxUsers: 5,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 128
      },
      {
        id: 'room-duo-1',
        name: '👥 Duo Odası Alpha',
        category: 'Duo',
        maxUsers: 2,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 128
      },
      {
        id: 'room-duo-2',
        name: '👥 Duo Odası Beta',
        category: 'Duo',
        maxUsers: 2,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 128
      },
      {
        id: 'room-lounge',
        name: '☕ Sohbet & Lounge',
        category: 'Casual',
        maxUsers: 20,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 128
      },
      {
        id: 'room-afk',
        name: '🌙 AFK / Sessiz Oda',
        category: 'Casual',
        maxUsers: 50,
        isPrivate: false,
        createdBy: 'system',
        members: [],
        bitrate: 64
      }
    ];

    for (const r of defaultRooms) {
      this.rooms.set(r.id, r);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data: DatabaseSchema = JSON.parse(raw);

        if (data.users) {
          for (const [id, u] of Object.entries(data.users)) {
            this.users.set(id, { ...u, status: 'offline', currentRoomId: undefined, socketId: undefined });
          }
        }
        if (data.friendships) {
          for (const [id, fList] of Object.entries(data.friendships)) {
            this.friendships.set(id, new Set(fList));
          }
        }
        if (data.friendRequests) {
          this.friendRequests = data.friendRequests.filter(req => req.status === 'pending');
        }
      }
    } catch (err) {
      console.warn('Could not load data.json, starting with fresh data:', err);
    }
  }

  private saveToDisk() {
    try {
      const usersObj: Record<string, UserProfile> = {};
      this.users.forEach((v, k) => {
        usersObj[k] = { ...v, status: 'offline', currentRoomId: undefined, socketId: undefined };
      });

      const friendshipsObj: Record<string, string[]> = {};
      this.friendships.forEach((v, k) => {
        friendshipsObj[k] = Array.from(v);
      });

      const data: DatabaseSchema = {
        users: usersObj,
        friendships: friendshipsObj,
        friendRequests: this.friendRequests,
        rooms: Array.from(this.rooms.values()).filter(r => r.createdBy === 'system')
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving data.json:', err);
    }
  }

  // --- USER METODLARI ---

  public getOrCreateUser(username: string, tag?: string, avatarPreset?: string): UserProfile {
    // Varsa mevcut kullanıcıyı bul
    let user: UserProfile | undefined;
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase() && (!tag || u.tag === tag)) {
        user = u;
        break;
      }
    }

    if (!user) {
      const newTag = tag || Math.floor(1000 + Math.random() * 9000).toString();
      const id = 'usr_' + uuidv4().slice(0, 8);
      const avatars = [
        'avatar-cyber-ninja',
        'avatar-gamer-cat',
        'avatar-neon-wolf',
        'avatar-space-marine',
        'avatar-mecha-pilot',
        'avatar-retro-pixel'
      ];
      const avatar = avatarPreset || avatars[Math.floor(Math.random() * avatars.length)];

      user = {
        id,
        username,
        tag: newTag,
        avatar,
        status: 'online',
        micMuted: false,
        deafened: false
      };
      this.users.set(id, user);
      this.friendships.set(id, new Set());
      this.saveToDisk();
    }

    return user;
  }

  public getUser(id: string): UserProfile | undefined {
    return this.users.get(id);
  }

  public findUserByUsernameAndTag(username: string, tag: string): UserProfile | undefined {
    const cleanUsername = username.trim().toLowerCase();
    const cleanTag = tag.trim().replace('#', '');
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === cleanUsername && u.tag === cleanTag) {
        return u;
      }
    }
    return undefined;
  }

  public updateUser(id: string, updates: Partial<UserProfile>): UserProfile | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  public setUserSocket(id: string, socketId?: string, status: UserProfile['status'] = 'online') {
    const user = this.users.get(id);
    if (user) {
      user.socketId = socketId;
      user.status = status;
      if (!socketId) {
        user.status = 'offline';
        user.currentRoomId = undefined;
      }
      this.users.set(id, user);
    }
  }

  // --- ARKADAŞLIK METODLARI ---

  public getFriends(userId: string): UserProfile[] {
    const friendIds = this.friendships.get(userId);
    if (!friendIds) return [];
    const list: UserProfile[] = [];
    for (const fId of friendIds) {
      const friend = this.users.get(fId);
      if (friend) list.push(friend);
    }
    return list;
  }

  public getPendingRequests(userId: string): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
    const incoming = this.friendRequests.filter(req => req.toUserId === userId && req.status === 'pending');
    const outgoing = this.friendRequests.filter(req => req.fromUserId === userId && req.status === 'pending');
    return { incoming, outgoing };
  }

  public sendFriendRequest(fromUserId: string, toUserId: string): { success: boolean; message: string; request?: FriendRequest } {
    if (fromUserId === toUserId) {
      return { success: false, message: 'Kendinize arkadaşlık isteği gönderemezsiniz.' };
    }

    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);
    if (!fromUser || !toUser) {
      return { success: false, message: 'Kullanıcı bulunamadı.' };
    }

    // Zaten arkadaşlar mı?
    const friends = this.friendships.get(fromUserId);
    if (friends && friends.has(toUserId)) {
      return { success: false, message: 'Bu kullanıcı zaten arkadaşınız.' };
    }

    // Zaten bekleyen bir istek var mı?
    const existing = this.friendRequests.find(
      req => req.status === 'pending' &&
        ((req.fromUserId === fromUserId && req.toUserId === toUserId) ||
         (req.fromUserId === toUserId && req.toUserId === fromUserId))
    );

    if (existing) {
      if (existing.fromUserId === toUserId) {
        // Karşı taraf zaten bize atmış, otomatik kabul et
        this.acceptFriendRequest(existing.id, fromUserId);
        return { success: true, message: 'Arkadaşlık isteği kabul edildi!', request: existing };
      }
      return { success: false, message: 'Zaten bekleyen bir arkadaşlık isteği mevcut.' };
    }

    const newReq: FriendRequest = {
      id: 'freq_' + uuidv4().slice(0, 8),
      fromUserId,
      toUserId,
      fromUser,
      toUser,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.friendRequests.push(newReq);
    this.saveToDisk();
    return { success: true, message: 'Arkadaşlık isteği gönderildi!', request: newReq };
  }

  public acceptFriendRequest(requestId: string, userId: string): { success: boolean; message: string; friendId?: string } {
    const req = this.friendRequests.find(r => r.id === requestId && r.toUserId === userId && r.status === 'pending');
    if (!req) {
      return { success: false, message: 'İstek bulunamadı veya yetkisiz işlem.' };
    }

    req.status = 'accepted';

    let f1 = this.friendships.get(req.fromUserId);
    if (!f1) { f1 = new Set(); this.friendships.set(req.fromUserId, f1); }
    f1.add(req.toUserId);

    let f2 = this.friendships.get(req.toUserId);
    if (!f2) { f2 = new Set(); this.friendships.set(req.toUserId, f2); }
    f2.add(req.fromUserId);

    this.saveToDisk();
    return { success: true, message: 'Arkadaşlık isteği kabul edildi.', friendId: req.fromUserId };
  }

  public rejectFriendRequest(requestId: string, userId: string): boolean {
    const req = this.friendRequests.find(r => r.id === requestId && r.toUserId === userId && r.status === 'pending');
    if (!req) return false;
    req.status = 'rejected';
    this.saveToDisk();
    return true;
  }

  public removeFriend(userId: string, friendId: string): boolean {
    const f1 = this.friendships.get(userId);
    if (f1) f1.delete(friendId);
    const f2 = this.friendships.get(friendId);
    if (f2) f2.delete(userId);
    this.saveToDisk();
    return true;
  }

  // --- ODA METODLARI ---

  public getAllRooms(): VoiceRoom[] {
    return Array.from(this.rooms.values());
  }

  public getRoom(roomId: string): VoiceRoom | undefined {
    return this.rooms.get(roomId);
  }

  public createRoom(name: string, category: VoiceRoom['category'], createdBy: string, options?: { maxUsers?: number; isPrivate?: boolean; password?: string; gameTitle?: string }): VoiceRoom {
    const id = 'room_' + uuidv4().slice(0, 8);
    const newRoom: VoiceRoom = {
      id,
      name,
      category,
      gameTitle: options?.gameTitle,
      maxUsers: options?.maxUsers || 10,
      isPrivate: !!options?.isPrivate,
      password: options?.password,
      createdBy,
      members: [],
      bitrate: 128
    };

    this.rooms.set(id, newRoom);
    return newRoom;
  }

  public joinRoom(roomId: string, user: UserProfile): { success: boolean; message?: string; room?: VoiceRoom } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Oda bulunamadı.' };

    if (room.members.length >= room.maxUsers && !room.members.some(m => m.id === user.id)) {
      return { success: false, message: 'Oda dolu!' };
    }

    // Önceki odadan çıkart
    this.leaveCurrentRoom(user.id);

    // Odaya ekle
    if (!room.members.some(m => m.id === user.id)) {
      room.members.push(user);
    }
    user.currentRoomId = roomId;
    this.users.set(user.id, user);

    return { success: true, room };
  }

  public leaveCurrentRoom(userId: string): VoiceRoom | undefined {
    const user = this.users.get(userId);
    if (!user || !user.currentRoomId) return undefined;

    const roomId = user.currentRoomId;
    const room = this.rooms.get(roomId);
    if (room) {
      room.members = room.members.filter(m => m.id !== userId);
      // Eğer özel ve geçici bir odaydı ve boşaldıysa sil (varsayılan sistem odaları hariç)
      if (room.members.length === 0 && room.createdBy !== 'system') {
        this.rooms.delete(roomId);
        this.roomMessages.delete(roomId);
      }
    }

    user.currentRoomId = undefined;
    this.users.set(userId, user);
    return room;
  }

  // --- ODA SOHBETİ ---

  public addMessage(roomId: string, userId: string, text: string): ChatMessage | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const msg: ChatMessage = {
      id: 'msg_' + uuidv4().slice(0, 8),
      roomId,
      userId,
      username: user.username,
      avatar: user.avatar,
      text,
      timestamp: Date.now()
    };

    let msgs = this.roomMessages.get(roomId);
    if (!msgs) {
      msgs = [];
      this.roomMessages.set(roomId, msgs);
    }
    msgs.push(msg);
    if (msgs.length > 100) msgs.shift(); // Son 100 mesajı tut

    return msg;
  }

  public getRoomMessages(roomId: string): ChatMessage[] {
    return this.roomMessages.get(roomId) || [];
  }

  // --- 1-1 ARAMA (DIRECT CALL) ---

  public startCall(callerId: string, receiverId: string): DirectCallSession | undefined {
    const caller = this.users.get(callerId);
    const receiver = this.users.get(receiverId);
    if (!caller || !receiver) return undefined;

    const callId = 'call_' + uuidv4().slice(0, 8);
    const session: DirectCallSession = {
      callId,
      callerId,
      receiverId,
      caller,
      receiver,
      status: 'ringing',
      startedAt: Date.now()
    };

    this.activeCalls.set(callId, session);
    return session;
  }

  public getCall(callId: string): DirectCallSession | undefined {
    return this.activeCalls.get(callId);
  }

  public endCall(callId: string): DirectCallSession | undefined {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = 'ended';
      this.activeCalls.delete(callId);
    }
    return call;
  }
}

export const store = new DataStore();
